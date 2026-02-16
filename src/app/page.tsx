"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

type RoomStatus = "lobby" | "in_game" | "finished";

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
};

type RoundEnd = {
  reason: "time_up" | "guessed";
  word: string;
  winnerNickname?: string;
  pointsAwarded: number;
};

type GameEnded = {
  rankings: Player[];
  winners: string[];
};

type GuessFeedback = {
  status: "correct" | "incorrect";
  message: string;
};

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? "";
const APP_STATUS = (process.env.NEXT_PUBLIC_APP_STATUS ?? "enabled").toLowerCase();

export default function Home() {
  const socketRef = useRef<Socket | null>(null);
  const [nickname, setNickname] = useState("");
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [roomStatus, setRoomStatus] = useState<RoomStatus>("lobby");
  const [players, setPlayers] = useState<Player[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [globalSeconds, setGlobalSeconds] = useState(180);
  const [round, setRound] = useState<RoundState | null>(null);
  const [roundEnd, setRoundEnd] = useState<RoundEnd | null>(null);
  const [ended, setEnded] = useState<GameEnded | null>(null);
  const [guessFeedback, setGuessFeedback] = useState<GuessFeedback | null>(null);
  const [guess, setGuess] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const missingSocketUrl = !SOCKET_URL;

  const isHost = useMemo(
    () => players.some((player) => player.id === playerId && player.isHost),
    [playerId, players]
  );

  useEffect(() => {
    if (missingSocketUrl) {
      return;
    }

    const socket = io(SOCKET_URL, { transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      setError("");
    });
    socket.on("disconnect", () => {
      setIsConnected(false);
    });
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
          setGlobalSeconds(180);
        }
      }
    );
    socket.on("game:started", () => {
      setRoomStatus("in_game");
      setRoundEnd(null);
      setEnded(null);
      setGuessFeedback(null);
    });
    socket.on("game:tick", (payload: { remainingSeconds: number }) => {
      setGlobalSeconds(payload.remainingSeconds);
    });
    socket.on(
      "game:round",
      (payload: { display: string; hint: string; roundEndsAt: number }) => {
        setRound({ display: payload.display, hint: payload.hint });
        setRoundEnd(null);
      }
    );
    socket.on("game:roundEnded", (payload: RoundEnd) => {
      setRound(null);
      setRoundEnd(payload);
      setGuessFeedback(null);
    });
    socket.on("game:ended", (payload: GameEnded) => {
      setRoomStatus("finished");
      setEnded(payload);
      setRound(null);
      setRoundEnd(null);
      setGuessFeedback(null);
      setGlobalSeconds(0);
    });
    socket.on(
      "game:guessResult",
      (payload: { status: "correct" | "incorrect"; word?: string; points?: number }) => {
        if (payload.status === "correct") {
          setGuessFeedback({
            status: "correct",
            message: `Correct! +${payload.points ?? 0} points`
          });
        } else {
          setGuessFeedback({
            status: "incorrect",
            message: "Not quite. Try another guess!"
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
    if (!guessFeedback) return;
    const timer = window.setTimeout(() => {
      setGuessFeedback(null);
    }, 900);
    return () => window.clearTimeout(timer);
  }, [guessFeedback]);

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
    if (APP_STATUS !== "enabled") {
      setError("Game is currently in maintenance mode.");
      return;
    }

    const safeName = nickname.trim();
    if (!safeName) {
      setError("Nickname is required.");
      return;
    }

    setBusy(true);
    setError("");
    withSocket((socket) => {
      socket.emit("room:create", { nickname: safeName }, (result: { ok: boolean; message?: string; playerId?: string }) => {
        setBusy(false);
        if (!result.ok) {
          setError(result.message ?? "Failed to create room");
          return;
        }
        setPlayerId(result.playerId ?? "");
        setIsJoined(true);
      });
    });
  }

  function joinRoom(event: FormEvent) {
    event.preventDefault();
    if (APP_STATUS !== "enabled") {
      setError("Game is currently in maintenance mode.");
      return;
    }

    const safeName = nickname.trim();
    const code = roomCodeInput.trim().toUpperCase();
    if (!safeName || !code) {
      setError("Nickname and room code are required.");
      return;
    }

    setBusy(true);
    setError("");
    withSocket((socket) => {
      socket.emit(
        "room:join",
        { roomCode: code, nickname: safeName },
        (result: { ok: boolean; message?: string; playerId?: string }) => {
          setBusy(false);
          if (!result.ok) {
            setError(result.message ?? "Failed to join room");
            return;
          }
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
        if (!result.ok) {
          setError(result.message ?? "Failed to start game");
        }
      });
    });
  }

  function submitGuess(event: FormEvent) {
    event.preventDefault();
    const safeGuess = guess.trim();
    if (!safeGuess) return;
    withSocket((socket) => {
      socket.emit("game:guess", { guess: safeGuess });
    });
    setGuess("");
  }

  function playAgain() {
    setBusy(true);
    setError("");
    withSocket((socket) => {
      socket.emit("game:playAgain", {}, (result: { ok: boolean; message?: string }) => {
        setBusy(false);
        if (!result.ok) {
          setError(result.message ?? "Failed to reset room");
        }
      });
    });
  }

  function endGameNow() {
    setBusy(true);
    setError("");
    withSocket((socket) => {
      socket.emit("game:end", {}, (result: { ok: boolean; message?: string }) => {
        setBusy(false);
        if (!result.ok) {
          setError(result.message ?? "Failed to end game");
        }
      });
    });
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">WordDash</h1>
            <div className="flex items-center gap-2 text-sm">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  isConnected ? "bg-emerald-400" : "bg-rose-400"
                }`}
              />
              <span>{isConnected ? "Realtime connected" : "Realtime disconnected"}</span>
            </div>
          </div>
          {roomCode ? (
            <p className="mt-2 text-sm text-slate-300">
              Room: <span className="font-semibold text-white">{roomCode}</span>
            </p>
          ) : null}
          {APP_STATUS !== "enabled" ? (
            <p className="mt-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-sm text-amber-200">
              Maintenance mode is enabled. Creating/joining rooms is disabled.
            </p>
          ) : null}
          {error ? (
            <p className="mt-3 rounded-md border border-rose-500/30 bg-rose-500/10 p-2 text-sm text-rose-200">
              {error}
            </p>
          ) : null}
          {missingSocketUrl ? (
            <p className="mt-3 rounded-md border border-rose-500/30 bg-rose-500/10 p-2 text-sm text-rose-200">
              Missing NEXT_PUBLIC_SOCKET_URL in environment.
            </p>
          ) : null}
        </header>

        {!isJoined ? (
          <section className="grid gap-4 md:grid-cols-2">
            <form
              onSubmit={createRoom}
              className="rounded-xl border border-slate-800 bg-slate-900 p-5"
            >
              <h2 className="mb-3 text-lg font-medium">Create Room</h2>
              <label className="text-sm text-slate-300">Nickname</label>
              <input
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 outline-none ring-0 focus:border-sky-400"
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                placeholder="Enter your nickname"
                maxLength={20}
              />
              <button
                type="submit"
                className="mt-4 rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 disabled:opacity-60"
                disabled={busy || APP_STATUS !== "enabled"}
              >
                {busy ? "Creating..." : "Create Room"}
              </button>
            </form>

            <form
              onSubmit={joinRoom}
              className="rounded-xl border border-slate-800 bg-slate-900 p-5"
            >
              <h2 className="mb-3 text-lg font-medium">Join Room</h2>
              <label className="text-sm text-slate-300">Nickname</label>
              <input
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 outline-none ring-0 focus:border-sky-400"
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                placeholder="Enter your nickname"
                maxLength={20}
              />
              <label className="mt-3 block text-sm text-slate-300">Room Code</label>
              <input
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 uppercase outline-none ring-0 focus:border-sky-400"
                value={roomCodeInput}
                onChange={(event) => setRoomCodeInput(event.target.value.toUpperCase())}
                placeholder="ABC123"
                maxLength={6}
              />
              <button
                type="submit"
                className="mt-4 rounded-md bg-emerald-400 px-4 py-2 text-sm font-medium text-slate-950 disabled:opacity-60"
                disabled={busy || APP_STATUS !== "enabled"}
              >
                {busy ? "Joining..." : "Join Room"}
              </button>
            </form>
          </section>
        ) : null}

        {isJoined ? (
          <section className="grid gap-4 md:grid-cols-[2fr_1fr]">
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              {roomStatus === "lobby" ? (
                <div>
                  <h2 className="text-lg font-medium">Lobby</h2>
                  <p className="mt-2 text-sm text-slate-300">
                    Waiting for host to start. Max 4 players.
                  </p>
                  {isHost ? (
                    <button
                      type="button"
                      onClick={startGame}
                      className="mt-4 rounded-md bg-violet-400 px-4 py-2 text-sm font-medium text-slate-950 disabled:opacity-60"
                      disabled={busy || players.length < 1}
                    >
                      {busy ? "Starting..." : "Start Game"}
                    </button>
                  ) : (
                    <p className="mt-4 text-sm text-slate-400">Only host can start game.</p>
                  )}
                </div>
              ) : null}

              {roomStatus === "in_game" ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-medium">Game In Progress</h2>
                    <div className="flex items-center gap-3">
                      <p className="text-sm text-slate-200">
                        Time Left:{" "}
                        <span className="font-semibold text-emerald-300">{globalSeconds}s</span>
                      </p>
                      {isHost ? (
                        <button
                          type="button"
                          onClick={endGameNow}
                          className="rounded-md border border-rose-400/60 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-200 hover:bg-rose-500/20"
                          disabled={busy}
                        >
                          End Game
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {round ? (
                    <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                      <p className="text-sm text-slate-300">Guess the word</p>
                      <p className="mt-1 text-2xl font-semibold tracking-widest">
                        {round.display}
                      </p>
                      <p className="mt-2 text-sm text-slate-200">
                        Hint: <span className="text-sky-300">{round.hint}</span>
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300">
                      Waiting for next round...
                    </div>
                  )}

                  {roundEnd ? (
                    <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 text-sm">
                      {roundEnd.reason === "guessed" ? (
                        <p>
                          <span className="font-semibold text-emerald-300">
                            {roundEnd.winnerNickname}
                          </span>{" "}
                          guessed <span className="font-semibold">{roundEnd.word}</span> and scored{" "}
                          <span className="font-semibold text-emerald-300">
                            {roundEnd.pointsAwarded}
                          </span>{" "}
                          points.
                        </p>
                      ) : (
                        <p>
                          Time&apos;s up. Word was{" "}
                          <span className="font-semibold">{roundEnd.word}</span>.
                        </p>
                      )}
                    </div>
                  ) : null}

                  {guessFeedback ? (
                    <div
                      className={`rounded-lg border p-3 text-sm font-medium transition-all duration-300 ${
                        guessFeedback.status === "correct"
                          ? "animate-pulse border-emerald-400/60 bg-emerald-500/15 text-emerald-200"
                          : "animate-pulse border-amber-400/60 bg-amber-500/15 text-amber-100"
                      }`}
                    >
                      {guessFeedback.message}
                    </div>
                  ) : null}

                  <form onSubmit={submitGuess} className="flex gap-2">
                    <input
                      className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 outline-none ring-0 focus:border-sky-400"
                      value={guess}
                      onChange={(event) => setGuess(event.target.value)}
                      placeholder="Type your guess..."
                      disabled={roomStatus !== "in_game"}
                    />
                    <button
                      type="submit"
                      className="rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950"
                      disabled={roomStatus !== "in_game"}
                    >
                      Guess
                    </button>
                  </form>
                </div>
              ) : null}

              {roomStatus === "finished" ? (
                <div className="space-y-3">
                  <h2 className="text-lg font-medium">Final Results</h2>
                  {ended?.winners?.length ? (
                    <p className="text-sm text-slate-300">
                      Winner(s):{" "}
                      <span className="font-semibold text-emerald-300">
                        {players
                          .filter((player) => ended.winners.includes(player.id))
                          .map((player) => player.nickname)
                          .join(", ")}
                      </span>
                    </p>
                  ) : null}
                  {isHost ? (
                    <button
                      type="button"
                      onClick={playAgain}
                      className="rounded-md bg-violet-400 px-4 py-2 text-sm font-medium text-slate-950"
                      disabled={busy}
                    >
                      {busy ? "Resetting..." : "Play Again"}
                    </button>
                  ) : (
                    <p className="text-sm text-slate-400">Waiting for host to restart room.</p>
                  )}
                </div>
              ) : null}
            </div>

            <aside className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <h3 className="text-base font-medium">Scoreboard</h3>
              <ul className="mt-3 space-y-2">
                {[...players]
                  .sort((a, b) => b.score - a.score)
                  .map((player) => (
                    <li
                      key={player.id}
                      className={`rounded-md border p-3 text-sm ${
                        player.id === playerId
                          ? "border-sky-400/50 bg-sky-400/10"
                          : "border-slate-800 bg-slate-950"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {player.nickname}
                          {player.isHost ? " (Host)" : ""}
                        </span>
                        <span className="font-semibold text-emerald-300">
                          {player.score}
                        </span>
                      </div>
                      {!player.connected ? (
                        <p className="mt-1 text-xs text-amber-300">Disconnected</p>
                      ) : null}
                    </li>
                  ))}
              </ul>
            </aside>
          </section>
        ) : null}
      </main>
    </div>
  );
}
