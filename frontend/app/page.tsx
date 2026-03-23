import Link from 'next/link';

export default function Home() {
  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="text-center py-16">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          Artisan Product Registry
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
          Verify the authenticity of handcrafted artisan products using blockchain technology.
          Each product is registered, certified, and tracked on the Stacks blockchain.
        </p>
        <div className="flex justify-center gap-4">
          <Link href="/verify" className="btn-primary text-lg px-8 py-3">
            Verify a Product
          </Link>
          <Link href="/register" className="btn-secondary text-lg px-8 py-3">
            Register as Artisan
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="grid md:grid-cols-3 gap-8">
        <div className="card text-center">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-2">Verified Authenticity</h3>
          <p className="text-gray-600">
            Every product is verified by trusted certifiers and recorded immutably on the blockchain.
          </p>
        </div>

        <div className="card text-center">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-2">Secure & Transparent</h3>
          <p className="text-gray-600">
            Built on Bitcoin via Stacks, providing unparalleled security and transparency.
          </p>
        </div>

        <div className="card text-center">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-2">NFT Provenance</h3>
          <p className="text-gray-600">
            Each verified product receives a unique NFT that tracks its entire history.
          </p>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-8">
        <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
        <div className="grid md:grid-cols-4 gap-6">
          {[
            { step: 1, title: 'Register', desc: 'Artisan registers and creates a profile' },
            { step: 2, title: 'Submit Product', desc: 'Add product details and metadata' },
            { step: 3, title: 'Get Certified', desc: 'Trusted certifiers verify authenticity' },
            { step: 4, title: 'Mint NFT', desc: 'Receive proof of authenticity as NFT' },
          ].map((item) => (
            <div key={item.step} className="text-center">
              <div className="w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                {item.step}
              </div>
              <h4 className="font-semibold mb-2">{item.title}</h4>
              <p className="text-sm text-gray-600">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-primary-50 rounded-2xl p-8">
        <div className="grid md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-4xl font-bold text-primary-600">1,000+</div>
            <div className="text-gray-600">Products Registered</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-primary-600">250+</div>
            <div className="text-gray-600">Verified Artisans</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-primary-600">50+</div>
            <div className="text-gray-600">Trusted Certifiers</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-primary-600">99.9%</div>
            <div className="text-gray-600">Verification Accuracy</div>
          </div>
        </div>
      </section>
    </div>
  );
}
