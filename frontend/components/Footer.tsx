import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-100 mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <h4 className="font-semibold mb-4">Artisan Registry</h4>
            <p className="text-sm text-gray-600">
              On-chain registry for artisan and craft product authenticity verification.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><Link href="/register" className="hover:text-primary-600">Register Product</Link></li>
              <li><Link href="/verify" className="hover:text-primary-600">Verify Product</Link></li>
              <li><Link href="/dashboard" className="hover:text-primary-600">Dashboard</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Resources</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><a href="#" className="hover:text-primary-600">Documentation</a></li>
              <li><a href="#" className="hover:text-primary-600">API Reference</a></li>
              <li><a href="#" className="hover:text-primary-600">Smart Contracts</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Connect</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><a href="#" className="hover:text-primary-600">Twitter</a></li>
              <li><a href="#" className="hover:text-primary-600">Discord</a></li>
              <li><a href="#" className="hover:text-primary-600">GitHub</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-200 mt-8 pt-8 text-center text-sm text-gray-600">
          <p>&copy; {new Date().getFullYear()} Artisan Registry. Built on Stacks.</p>
        </div>
      </div>
    </footer>
  );
}
