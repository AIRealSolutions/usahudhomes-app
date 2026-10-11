import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { CheckCircle, Home, Phone, Mail, ArrowRight } from 'lucide-react';

export default function ContactThankYou() {
  const location = useLocation();
  const { name, referralId, account } = location.state || { name: 'there', referralId: null };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center py-12 px-4">
      <div className="max-w-2xl w-full">
        <div className="flex justify-center mb-8">
          <div className="bg-green-100 rounded-full p-6">
            <CheckCircle className="h-24 w-24 text-green-600" />
          </div>
        </div>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Thank You, {name}!
          </h1>
          <p className="text-xl text-gray-600 mb-6">
            Your request has been successfully submitted.
          </p>
          {account && <AccountNotice account={account} />}
          <div className="bg-white rounded-lg shadow-lg p-8 text-left">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">What Happens Next?</h2>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 bg-blue-100 rounded-full p-2 mr-4">
                  <span className="text-blue-600 font-bold">1</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">We'll Review Your Request</h3>
                  <p className="text-gray-600">Our team will match you with the best HUD-registered broker in your area.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 bg-blue-100 rounded-full p-2 mr-4">
                  <span className="text-blue-600 font-bold">2</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Broker Will Contact You</h3>
                  <p className="text-gray-600">Expect a call or email within 24 hours to discuss your needs.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 bg-blue-100 rounded-full p-2 mr-4">
                  <span className="text-blue-600 font-bold">3</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Start Your Home Search</h3>
                  <p className="text-gray-600">Your broker will help you find the perfect HUD home at below-market prices.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
            Questions? We're Here to Help
          </h3>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-6">
            <div className="flex items-center text-gray-700">
              <Phone className="h-5 w-5 mr-2 text-blue-600" />
              <span className="font-medium">(910) 363-6147</span>
            </div>
            <div className="flex items-center text-gray-700">
              <Mail className="h-5 w-5 mr-2 text-blue-600" />
              <span className="font-medium">info@usahudhomes.com</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            <Home className="h-5 w-5 mr-2" />
            Return to Homepage
          </Link>
          <Link
            to="/search"
            className="inline-flex items-center justify-center px-6 py-3 bg-white text-blue-600 border-2 border-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
          >
            Browse HUD Homes
            <ArrowRight className="h-5 w-5 ml-2" />
          </Link>
        </div>

        {referralId && (
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              Reference ID: <span className="font-mono font-medium">{referralId}</span>
            </p>
          </div>
        )}

        <div className="mt-12 text-center">
          <p className="text-sm text-gray-600 max-w-xl mx-auto">
            <strong>Tip:</strong> While you wait, feel free to browse our available HUD properties.
          </p>
        </div>
      </div>
    </div>
  );
}

// What happened to the buyer account created alongside the request
function AccountNotice({ account }) {
  const email = <strong>{account.email}</strong>;
  const notices = {
    confirm: {
      tone: 'bg-blue-50 border-blue-200',
      title: 'Your account is almost ready',
      body: <>We sent a confirmation link to {email}. Click it, then sign in with your email and password.</>,
    },
    ready: {
      tone: 'bg-green-50 border-green-200',
      title: 'Your account is ready',
      body: <>You can sign in any time with {email} and the password you chose.</>,
    },
    exists: {
      tone: 'bg-blue-50 border-blue-200',
      title: 'You already have an account',
      body: <>{email} is already registered. Sign in with your existing password, or reset it from the sign-in page.</>,
    },
    failed: {
      tone: 'bg-yellow-50 border-yellow-200',
      title: "We couldn't create your account",
      body: <>Your request was still sent to our team. You can create an account from the sign-in page{account.error ? ` (${account.error})` : ''}.</>,
    },
  };
  const n = notices[account.status] || notices.failed;
  return (
    <div className={`border rounded-lg p-5 mb-6 text-left ${n.tone}`}>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">{n.title}</h2>
      <p className="text-gray-700">{n.body}</p>
      {account.status !== 'ready' && (
        <Link
          to={account.status === 'failed' ? '/login?signup=1' : '/login'}
          className="inline-block mt-3 text-blue-600 font-semibold hover:underline"
        >
          {account.status === 'failed' ? 'Create an account' : 'Go to sign in'} →
        </Link>
      )}
    </div>
  );
}
