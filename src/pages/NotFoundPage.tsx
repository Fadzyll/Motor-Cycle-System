import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <div className="grid min-h-full place-items-center p-6 text-center">
      <div>
        <p className="text-lg font-semibold">Page not found</p>
        <Link to="/dashboard" className="mt-2 inline-block text-primary underline">
          Go to dashboard
        </Link>
      </div>
    </div>
  )
}
