// Server-Sent Events: the polling engine publishes a snapshot after every
// poll tick and each connected dashboard applies it immediately — no page
// refresh interval.
//
// The endpoint is public and unauthenticated, so it is bounded: a fixed
// number of concurrent streams, and a stream whose reader stops reading is
// dropped instead of buffering snapshots forever. Neither limit touches the
// polling engine or the alerts; at worst a dashboard falls back to retrying.

import { listenerCount, snapshot, subscribe, type Snapshot } from '@/lib/state';

export const dynamic = 'force-dynamic';

/** Concurrent dashboard streams; far above any real audience. */
const MAX_STREAMS = Number(process.env.MAX_STREAMS ?? 100);
/** Unread frames a client may fall behind before its stream is dropped. */
const MAX_QUEUED_FRAMES = 5;

export function GET(): Response {
  if (listenerCount() >= MAX_STREAMS) {
    return new Response('too many open streams\n', {
      status: 503,
      headers: { 'retry-after': '30', 'cache-control': 'no-store' },
    });
  }

  const encoder = new TextEncoder();
  let unsubscribe = () => {};
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  const cleanup = () => {
    unsubscribe();
    if (heartbeat) clearInterval(heartbeat);
  };

  const stream = new ReadableStream({
    start(controller) {
      const push = (frame: string) => {
        try {
          // desiredSize goes negative as frames queue up unread.
          if ((controller.desiredSize ?? 0) < -MAX_QUEUED_FRAMES) {
            cleanup();
            controller.error(new Error('stream reader too slow'));
            return;
          }
          controller.enqueue(encoder.encode(frame));
        } catch {
          cleanup();
        }
      };
      const send = (snap: Snapshot) => push(`data: ${JSON.stringify(snap)}\n\n`);
      send(snapshot());
      unsubscribe = subscribe(send);
      heartbeat = setInterval(() => push(`: keep-alive\n\n`), 25_000);
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
    },
  });
}
