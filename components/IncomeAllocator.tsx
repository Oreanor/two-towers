type Props = {
  pendingIncome: number;
  onAllToCastle: () => void;
};

export default function IncomeAllocator({ pendingIncome, onAllToCastle }: Props) {
  return (
    <div className="rounded-lg border border-purple-300 bg-purple-50 p-4 flex flex-col gap-2">
      <h2 className="text-sm font-bold uppercase text-purple-700">
        Reinforcements: {pendingIncome}
      </h2>
      <p className="text-xs text-purple-800">
        Click your castle or a fort (highlighted) to place +1 soldier, or:
      </p>
      <button
        onClick={onAllToCastle}
        className="rounded bg-purple-700 px-3 py-1 text-sm text-white hover:bg-purple-600"
      >
        Place all in castle
      </button>
    </div>
  );
}
