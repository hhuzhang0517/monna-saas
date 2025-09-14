import Link from 'next/link';

export default function AuthCodeError() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center max-w-md mx-auto p-6">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Authentication Error</h1>
        <p className="text-gray-600 mb-6">
          There was an error during the authentication process. This could be because:
        </p>
        <ul className="text-left text-gray-600 mb-6 space-y-2">
          <li>• The confirmation link has expired</li>
          <li>• The link has already been used</li>
          <li>• OAuth provider configuration issue</li>
          <li>• There was a technical issue</li>
        </ul>
        <div className="space-y-3">
          <Link 
            href="/sign-in"
            className="block w-full bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 transition-colors"
          >
            Try Again
          </Link>
          <Link 
            href="/resend-confirmation"
            className="block w-full bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors"
          >
            Resend Confirmation Email
          </Link>
        </div>
        <p className="text-xs text-gray-500 mt-4">
          If you're having trouble with Google or Apple login, try using email and password instead.
        </p>
      </div>
    </div>
  )
}