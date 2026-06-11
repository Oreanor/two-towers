'use client';

import { useEffect, useRef } from 'react';

type Props = {
  log: string[];
};

export default function LogPanel({ log }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log.length]);

  return (
    <div className="rounded-lg border border-gray-300 p-4">
      <h2 className="mb-2 text-sm font-bold uppercase text-gray-500">Log</h2>
      <div className="flex h-48 flex-col gap-1 overflow-y-auto text-xs">
        {log.map((entry, i) => (
          <p key={i} className="text-gray-700">
            {entry}
          </p>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
