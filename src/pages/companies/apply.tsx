// pages/companies/apply.tsx

import { useState, FormEvent } from 'react';
import Layout from '@/components/Layout';

const ApplyPage = () => {
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    setError('');

    try {
      const response = await fetch('/api/companies/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, companyName }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '申請に失敗しました。');
      }

      setMessage('利用申請を受け付けました。運営からの承認をお待ちください。');
      setEmail('');
      setCompanyName('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-4 text-center">企業利用申請</h1>
        <p className="text-center text-slate-600 mb-8">
          skilltrailの企業向け機能の利用をご希望の場合は、以下のフォームより申請してください。
          運営にて確認後、ご登録いただいたメールアドレスにご連絡いたします。
        </p>
        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-lg shadow-md">
          <div>
            <label htmlFor="companyName" className="block text-sm font-medium text-slate-700">会社名</label>
            <input
              id="companyName"
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700">担当者様のメールアドレス</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="your.name@company.com"
            />
          </div>
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? '送信中...' : 'この内容で申請する'}
            </button>
          </div>
          {message && <p className="text-green-600 text-center">{message}</p>}
          {error && <p className="text-red-600 text-center">{error}</p>}
        </form>
      </div>
    </Layout>
  );
};

export default ApplyPage;
