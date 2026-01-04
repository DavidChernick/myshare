import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 sm:px-8 py-32 sm:py-40">
          <div className="max-w-3xl">
            <h1 className="text-5xl sm:text-6xl font-semibold tracking-tight mb-6" style={{ color: '#0B1F3A', lineHeight: '1.1' }}>
              Support the causes you care about
            </h1>
            <p className="text-xl text-slate-600 mb-10 leading-relaxed">
              A simple platform connecting donors with verified charities. Make an impact with every donation.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/charities"
                className="inline-flex items-center justify-center px-6 py-3 text-base font-medium text-white rounded-lg transition-all"
                style={{ backgroundColor: '#16A34A' }}
              >
                Explore charities
              </Link>
              <Link
                href="/auth"
                className="inline-flex items-center justify-center px-6 py-3 text-base font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-slate-50">
        <div className="max-w-5xl mx-auto px-6 sm:px-8 py-24">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
            <div>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#0B1F3A' }}>
                Discover charities
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Browse verified organizations and find causes that align with your values.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#0B1F3A' }}>
                Give with confidence
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Track your donations and see the impact of your generosity in one place.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#0B1F3A' }}>
                Make an impact
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Every donation supports meaningful work and drives real change.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-white border-t border-slate-200">
        <div className="max-w-5xl mx-auto px-6 sm:px-8 py-24">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight mb-4" style={{ color: '#0B1F3A' }}>
              Ready to get started?
            </h2>
            <p className="text-lg text-slate-600 mb-8 leading-relaxed">
              Join the community of donors supporting impactful charities.
            </p>
            <Link
              href="/charities"
              className="inline-flex items-center justify-center px-6 py-3 text-base font-medium text-white rounded-lg transition-all"
              style={{ backgroundColor: '#16A34A' }}
            >
              View all charities
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
