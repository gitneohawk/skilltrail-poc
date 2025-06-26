export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-blue-200 text-gray-900 p-4">
      {children}
    </div>
  );
}