export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    // 背景を単色のslate-50に
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* コンテンツを中央に配置し、適切な余白（padding）を設定 */}
      <main className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
