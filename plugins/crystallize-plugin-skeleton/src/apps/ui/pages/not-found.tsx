export function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
            <h1 className="text-6xl font-bold text-gray-800 mb-4">404</h1>
            <p className="text-xl text-gray-600 mb-6">Not found</p>
            <p className="text-gray-600 mb-6">The page you are looking for doesn't exist.</p>
            <a href="/" class="rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background no-underline">
                Go Home
            </a>
        </div>
    );
}
