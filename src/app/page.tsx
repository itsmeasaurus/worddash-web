"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

type RoomStatus = "lobby" | "in_game" | "finished";
type RoundEndReason = "time_up" | "guessed" | "host_ended";

type Player = {
  id: string;
  nickname: string;
  score: number;
  connected: boolean;
  isHost: boolean;
};

type RoundState = {
  display: string;
  hint: string;
  roundEndsAt: number;
  roundDurationMs: number;
};

type RoundEnd = {
  reason: RoundEndReason;
  word: string;
  winnerPlayerId?: string | null;
  winnerNickname?: string | null;
  pointsAwarded: number;
};

type ReviewRow = {
  word: string;
  winnerPlayerId: string | null;
  winnerNickname: string | null;
  pointsAwarded: number;
  reason: RoundEndReason;
};

type GameEnded = {
  rankings: Player[];
  winners: string[];
  reviewRows: ReviewRow[];
};

type GuessFeedback = {
  status: "correct" | "incorrect";
  message: string;
};

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? "";
const APP_STATUS = (process.env.NEXT_PUBLIC_APP_STATUS ?? "enabled").toLowerCase();

function initialsForName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function avatarColors(name: string) {
  const palette = [
    ["#fde047", "#f97316"],
    ["#a7f3d0", "#06b6d4"],
    ["#fbcfe8", "#f43f5e"],
    ["#bfdbfe", "#6366f1"],
    ["#fed7aa", "#ef4444"],
    ["#d9f99d", "#84cc16"]
  ];
  const key = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return palette[key % palette.length];
}

function withCommas(value: number) {
  return new Intl.NumberFormat().format(value);
}

function previewDisplay(baseDisplay: string, typedGuess: string) {
  const tokens = baseDisplay.split(" ");
  if (tokens.length <= 2) return baseDisplay;
  const typed = typedGuess.trim().toUpperCase().replace(/\s+/g, "");

  for (let idx = 1; idx < tokens.length - 1; idx += 1) {
    const guessedChar = typed[idx];
    if (guessedChar && /^[A-Z]$/.test(guessedChar)) {
      tokens[idx] = guessedChar;
    }
  }
  return tokens.join(" ");
}

export default function Home() {
  const socketRef = useRef<Socket | null>(null);

  const [nickname, setNickname] = useState("");
  const [roomCodeInput, setRoomCodeInput] = useState(() => {
    if (typeof window === "undefined") return "";
    const params = new URLSearchParams(window.location.search);
    return (params.get("room") ?? "").toUpperCase();
  });
  const [roomCode, setRoomCode] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [roomStatus, setRoomStatus] = useState<RoomStatus>("lobby");
  const [players, setPlayers] = useState<Player[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [globalSeconds, setGlobalSeconds] = useState(180);
  const [round, setRound] = useState<RoundState | null>(null);
  const [roundRemainingMs, setRoundRemainingMs] = useState(0);
  const [roundEnd, setRoundEnd] = useState<RoundEnd | null>(null);
  const [ended, setEnded] = useState<GameEnded | null>(null);
  const [guessFeedback, setGuessFeedback] = useState<GuessFeedback | null>(null);
  const [copyStatus, setCopyStatus] = useState("");
  const [guess, setGuess] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const missingSocketUrl = !SOCKET_URL;
  const isHost = useMemo(
    () => players.some((player) => player.id === playerId && player.isHost),
    [playerId, players]
  );
  const sortedPlayers = useMemo(
    () => [...players].sort((a, b) => b.score - a.score),
    [players]
  );
  const inviteLink = useMemo(() => {
    if (!roomCode || typeof window === "undefined") return "";
    return `${window.location.origin}/?room=${roomCode}`;
  }, [roomCode]);
  const roundProgress = useMemo(() => {
    if (!round || round.roundDurationMs <= 0) return 0;
    return Math.min(1, Math.max(0, roundRemainingMs / round.roundDurationMs));
  }, [round, roundRemainingMs]);
  const roundBorderColor = useMemo(() => {
    if (roundProgress > 0.66) return "#facc15";
    if (roundProgress > 0.33) return "#f97316";
    return "#ef4444";
  }, [roundProgress]);
  const previewText = useMemo(() => {
    if (!round) return "";
    return previewDisplay(round.display, guess);
  }, [guess, round]);

  useEffect(() => {
    if (missingSocketUrl) return;

    const socket = io(SOCKET_URL, { transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      setError("");
    });
    socket.on("disconnect", () => setIsConnected(false));
    socket.on("server:error", (payload: { message?: string }) => {
      setError(payload.message ?? "Unexpected server error");
      setBusy(false);
    });

    socket.on(
      "room:state",
      (payload: { roomCode: string; status: RoomStatus; players: Player[] }) => {
        setRoomCode(payload.roomCode);
        setRoomStatus(payload.status);
        setPlayers(payload.players);
        if (payload.status === "lobby") {
          setRound(null);
          setRoundEnd(null);
          setEnded(null);
          setGuessFeedback(null);
          setRoundRemainingMs(0);
          setGlobalSeconds(180);
        }
      }
    );

    socket.on("game:started", () => {
      setRoomStatus("in_game");
      setRoundEnd(null);
      setEnded(null);
      setGuessFeedback(null);
      setCopyStatus("");
    });

    socket.on("game:tick", (payload: { remainingSeconds: number }) => {
      setGlobalSeconds(payload.remainingSeconds);
    });

    socket.on(
      "game:round",
      (payload: { display: string; hint: string; roundEndsAt: number; roundDurationMs: number }) => {
        setRound({
          display: payload.display,
          hint: payload.hint,
          roundEndsAt: payload.roundEndsAt,
          roundDurationMs: payload.roundDurationMs
        });
        setRoundRemainingMs(payload.roundDurationMs);
        setRoundEnd(null);
        setGuessFeedback(null);
        setGuess("");
      }
    );

    socket.on("game:roundEnded", (payload: RoundEnd) => {
      setRound(null);
      setRoundRemainingMs(0);
      setRoundEnd(payload);
      setGuessFeedback(null);
      setGuess("");
    });

    socket.on("game:ended", (payload: GameEnded) => {
      setRoomStatus("finished");
      setEnded(payload);
      setRound(null);
      setRoundRemainingMs(0);
      setRoundEnd(null);
      setGuessFeedback(null);
      setGlobalSeconds(0);
      setGuess("");
    });

    socket.on(
      "game:guessResult",
      (payload: { status: "correct" | "incorrect"; points?: number }) => {
        if (payload.status === "correct") {
          setGuessFeedback({
            status: "correct",
            message: `CORRECT! +${payload.points ?? 10} POINTS`
          });
        } else {
          setGuessFeedback({
            status: "incorrect",
            message: "NOPE. TRY AGAIN."
          });
        }
      }
    );

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [missingSocketUrl]);

  useEffect(() => {
    if (!round) return;
    const tick = window.setInterval(() => {
      const nextMs = Math.max(0, round.roundEndsAt - Date.now());
      setRoundRemainingMs(nextMs);
    }, 100);
    return () => window.clearInterval(tick);
  }, [round]);

  useEffect(() => {
    if (!guessFeedback) return;
    const timer = window.setTimeout(() => setGuessFeedback(null), 900);
    return () => window.clearTimeout(timer);
  }, [guessFeedback]);

  useEffect(() => {
    if (!copyStatus) return;
    const timer = window.setTimeout(() => setCopyStatus(""), 1400);
    return () => window.clearTimeout(timer);
  }, [copyStatus]);

  function withSocket(action: (socket: Socket) => void) {
    const socket = socketRef.current;
    if (!socket) {
      setError("Socket is not ready");
      return;
    }
    action(socket);
  }

  function createRoom(event: FormEvent) {
    event.preventDefault();
    if (APP_STATUS !== "enabled") return setError("Game is in maintenance mode.");
    if (!nickname.trim()) return setError("Nickname is required.");

    setBusy(true);
    setError("");
    withSocket((socket) => {
      socket.emit("room:create", { nickname: nickname.trim() }, (result: { ok: boolean; message?: string; playerId?: string }) => {
        setBusy(false);
        if (!result.ok) return setError(result.message ?? "Failed to create room");
        setPlayerId(result.playerId ?? "");
        setIsJoined(true);
      });
    });
  }

  function joinRoom(event: FormEvent) {
    event.preventDefault();
    if (APP_STATUS !== "enabled") return setError("Game is in maintenance mode.");
    if (!nickname.trim() || !roomCodeInput.trim()) {
      return setError("Nickname and room code are required.");
    }

    setBusy(true);
    setError("");
    withSocket((socket) => {
      socket.emit(
        "room:join",
        { roomCode: roomCodeInput.trim().toUpperCase(), nickname: nickname.trim() },
        (result: { ok: boolean; message?: string; playerId?: string }) => {
          setBusy(false);
          if (!result.ok) return setError(result.message ?? "Failed to join room");
          setPlayerId(result.playerId ?? "");
          setIsJoined(true);
        }
      );
    });
  }

  function startGame() {
    setBusy(true);
    setError("");
    withSocket((socket) => {
      socket.emit("game:start", {}, (result: { ok: boolean; message?: string }) => {
        setBusy(false);
        if (!result.ok) setError(result.message ?? "Failed to start game");
      });
    });
  }

  function endGameNow() {
    setBusy(true);
    setError("");
    withSocket((socket) => {
      socket.emit("game:end", {}, (result: { ok: boolean; message?: string }) => {
        setBusy(false);
        if (!result.ok) setError(result.message ?? "Failed to end game");
      });
    });
  }

  function playAgain() {
    setBusy(true);
    setError("");
    withSocket((socket) => {
      socket.emit("game:playAgain", {}, (result: { ok: boolean; message?: string }) => {
        setBusy(false);
        if (!result.ok) setError(result.message ?? "Failed to reset room");
      });
    });
  }

  function submitGuess(event: FormEvent) {
    event.preventDefault();
    const safeGuess = guess.trim();
    if (!safeGuess) return;
    withSocket((socket) => socket.emit("game:guess", { guess: safeGuess }));
    setGuess("");
  }

  async function copyInvite() {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopyStatus("INVITE LINK COPIED");
    } catch {
      setCopyStatus("COPY FAILED");
    }
  }

  return (
    <div className="min-h-screen bg-[#ffe45e] px-4 py-6 text-[#111] md:px-8">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <header className="neo-card bg-[#fffcf5]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-3xl font-black uppercase tracking-widest">WordDash</h1>
            <div className="neo-pill text-sm">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  isConnected ? "bg-emerald-500" : "bg-rose-500"
                }`}
              />
              <span className="font-black uppercase">{isConnected ? "online" : "offline"}</span>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {roomCode ? (
              <span className="neo-tag">
                ROOM <b>{roomCode}</b>
              </span>
            ) : null}
            {roomCode && isHost ? (
              <button type="button" onClick={copyInvite} className="neo-button-sm bg-[#67e8f9]">
                Copy Invitation Link
              </button>
            ) : null}
            {copyStatus ? <span className="neo-tag bg-[#d9f99d]">{copyStatus}</span> : null}
          </div>

          {APP_STATUS !== "enabled" ? (
            <p className="neo-alert mt-3">Maintenance mode is enabled.</p>
          ) : null}
          {error ? <p className="neo-alert mt-3">{error}</p> : null}
          {missingSocketUrl ? (
            <p className="neo-alert mt-3">Missing NEXT_PUBLIC_SOCKET_URL in environment.</p>
          ) : null}
        </header>

        {!isJoined ? (
          <section className="grid gap-5 md:grid-cols-2">
            <form onSubmit={createRoom} className="neo-card bg-[#ffffff]">
              <h2 className="neo-title">Create Room</h2>
              <label className="neo-label">Nickname</label>
              <input
                className="neo-input"
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                placeholder="Your nickname"
                maxLength={20}
              />
              <button
                type="submit"
                className="neo-button mt-4 bg-[#67e8f9]"
                disabled={busy || APP_STATUS !== "enabled"}
              >
                {busy ? "Creating..." : "Create Room"}
              </button>
            </form>

            <form onSubmit={joinRoom} className="neo-card bg-[#fff7ed]">
              <h2 className="neo-title">Join Room</h2>
              <label className="neo-label">Nickname</label>
              <input
                className="neo-input"
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                placeholder="Your nickname"
                maxLength={20}
              />
              <label className="neo-label mt-3 block">Room Code</label>
              <input
                className="neo-input uppercase"
                value={roomCodeInput}
                onChange={(event) => setRoomCodeInput(event.target.value.toUpperCase())}
                placeholder="ABC123"
                maxLength={6}
              />
              <button
                type="submit"
                className="neo-button mt-4 bg-[#a7f3d0]"
                disabled={busy || APP_STATUS !== "enabled"}
              >
                {busy ? "Joining..." : "Join Room"}
              </button>
            </form>
          </section>
        ) : null}

        {isJoined ? (
          <section className="grid gap-5 md:grid-cols-[2fr_1fr]">
            <div className="neo-card bg-white">
              {roomStatus === "lobby" ? (
                <div>
                  <h2 className="neo-title">Waiting Room</h2>
                  <p className="mt-1 text-sm font-semibold uppercase">Max 4 players</p>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {players.map((player) => {
                      const [bgA, bgB] = avatarColors(player.nickname);
                      return (
                        <div key={player.id} className="neo-card-mini bg-[#fffbe8]">
                          <div className="flex items-center gap-3">
                            <div
                              className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-black text-sm font-black"
                              style={{ background: `linear-gradient(135deg, ${bgA}, ${bgB})` }}
                            >
                              {initialsForName(player.nickname)}
                            </div>
                            <div>
                              <p className="font-black uppercase tracking-wide">{player.nickname}</p>
                              <p className="text-xs font-bold uppercase">
                                {player.isHost ? "Host" : "Player"} ·{" "}
                                {player.connected ? "online" : "offline"}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {isHost ? (
                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={startGame}
                        className="neo-button bg-[#f9a8d4]"
                        disabled={busy || players.length < 1}
                      >
                        {busy ? "Starting..." : "Start Game"}
                      </button>
                      <button type="button" onClick={copyInvite} className="neo-button bg-[#67e8f9]">
                        Copy Invitation Link
                      </button>
                    </div>
                  ) : (
                    <p className="mt-5 text-sm font-bold uppercase">Only host can start the game.</p>
                  )}
                </div>
              ) : null}

              {roomStatus === "in_game" ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="neo-title">Game In Progress</h2>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="neo-tag bg-[#fef08a]">Match Time {globalSeconds}s</span>
                      <span className="neo-tag bg-[#fdba74]">
                        Round {Math.ceil(roundRemainingMs / 1000)}s
                      </span>
                      {isHost ? (
                        <button
                          type="button"
                          onClick={endGameNow}
                          className="neo-button-sm bg-[#fda4af]"
                          disabled={busy}
                        >
                          End Game
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {round ? (
                    <div
                      className="rounded-[20px] p-[6px]"
                      style={{
                        background: `conic-gradient(${roundBorderColor} ${Math.round(
                          roundProgress * 360
                        )}deg, #1f2937 0deg)`
                      }}
                    >
                      <div className="rounded-[16px] border-4 border-black bg-[#fffbe8] p-5">
                        <p className="text-xs font-black uppercase tracking-wider">Guess Word</p>
                        <p className="mt-2 text-3xl font-black tracking-[0.35em]">{previewText}</p>
                        <p className="mt-3 text-sm font-semibold">
                          Hint: <span className="font-black">{round.hint}</span>
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="neo-card-mini bg-[#fffbe8]">Waiting for next round...</div>
                  )}

                  {roundEnd ? (
                    <div className="neo-card-mini bg-[#f8fafc]">
                      {roundEnd.reason === "guessed" ? (
                        <p className="font-bold uppercase">
                          {roundEnd.winnerNickname} guessed{" "}
                          <span className="font-black">{roundEnd.word}</span> for{" "}
                          <span className="font-black">+{roundEnd.pointsAwarded}</span>
                        </p>
                      ) : (
                        <p className="font-bold uppercase">
                          Time up. Correct word: <span className="font-black">{roundEnd.word}</span>
                        </p>
                      )}
                    </div>
                  ) : null}

                  {guessFeedback ? (
                    <div
                      className={`rounded-xl border-4 border-black px-4 py-3 text-sm font-black uppercase shadow-[4px_4px_0_#000] transition-all duration-200 ${
                        guessFeedback.status === "correct"
                          ? "animate-pulse bg-[#86efac]"
                          : "animate-pulse bg-[#fdba74]"
                      }`}
                    >
                      {guessFeedback.message}
                    </div>
                  ) : null}

                  <form onSubmit={submitGuess} className="flex gap-2">
                    <input
                      className="neo-input"
                      value={guess}
                      onChange={(event) => setGuess(event.target.value)}
                      placeholder="Type your guess..."
                      disabled={roomStatus !== "in_game"}
                    />
                    <button type="submit" className="neo-button bg-[#67e8f9]" disabled={roomStatus !== "in_game"}>
                      Guess
                    </button>
                  </form>
                </div>
              ) : null}

              {roomStatus === "finished" ? (
                <div className="space-y-4">
                  <h2 className="neo-title">Final Results</h2>
                  {ended?.winners?.length ? (
                    <p className="neo-tag bg-[#d9f99d]">
                      WINNER(S):{" "}
                      {players
                        .filter((player) => ended.winners.includes(player.id))
                        .map((player) => player.nickname)
                        .join(", ")}
                    </p>
                  ) : null}

                  {ended?.reviewRows?.length ? (
                    <div className="overflow-x-auto rounded-xl border-4 border-black bg-white shadow-[4px_4px_0_#000]">
                      <table className="min-w-full border-collapse text-sm">
                        <thead>
                          <tr className="bg-[#fde68a]">
                            <th className="border-2 border-black px-3 py-2 text-left font-black uppercase">
                              Word
                            </th>
                            {players.map((player) => (
                              <th
                                key={player.id}
                                className="border-2 border-black px-3 py-2 text-left font-black uppercase"
                              >
                                {player.nickname}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {ended.reviewRows.map((row, index) => (
                            <tr key={`${row.word}-${index}`} className="bg-[#fffbeb]">
                              <td className="border-2 border-black px-3 py-2 font-black uppercase">
                                {row.word}
                              </td>
                              {players.map((player) => {
                                const isWinner = row.winnerPlayerId === player.id;
                                return (
                                  <td key={`${index}-${player.id}`} className="border-2 border-black px-3 py-2">
                                    {isWinner ? (
                                      <span className="font-black uppercase">
                                        {row.word} (+{row.pointsAwarded})
                                      </span>
                                    ) : row.reason === "time_up" || row.reason === "host_ended" ? (
                                      <span className="font-semibold uppercase text-gray-500">-</span>
                                    ) : (
                                      <span className="font-semibold uppercase text-gray-500">-</span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}

                  {isHost ? (
                    <button
                      type="button"
                      onClick={playAgain}
                      className="neo-button bg-[#a7f3d0]"
                      disabled={busy}
                    >
                      {busy ? "Resetting..." : "Play Again"}
                    </button>
                  ) : (
                    <p className="text-sm font-bold uppercase">Waiting for host to restart room.</p>
                  )}
                </div>
              ) : null}
            </div>

            <aside className="neo-card bg-[#fff7ed]">
              <h3 className="text-xl font-black uppercase tracking-wide">Players</h3>
              <ul className="mt-3 space-y-2">
                {sortedPlayers.map((player) => {
                  const [bgA, bgB] = avatarColors(player.nickname);
                  return (
                    <li
                      key={player.id}
                      className={`neo-card-mini ${
                        player.id === playerId ? "bg-[#dbeafe]" : "bg-[#fffbe8]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-black text-xs font-black"
                            style={{ background: `linear-gradient(135deg, ${bgA}, ${bgB})` }}
                          >
                            {initialsForName(player.nickname)}
                          </div>
                          <div>
                            <p className="text-sm font-black uppercase">{player.nickname}</p>
                            <p className="text-[10px] font-bold uppercase">
                              {player.connected ? "online" : "offline"}
                            </p>
                          </div>
                        </div>
                        {roomStatus !== "lobby" ? (
                          <span className="neo-tag bg-[#bbf7d0]">{withCommas(player.score)}</span>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </aside>
          </section>
        ) : null}
      </main>
    </div>
  );
}
