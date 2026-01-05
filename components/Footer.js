const Footer = () => {
  return (
    <footer className="bg-brand-dark text-white py-16 px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="col-span-1">
            <h3 className="text-2xl font-bold mb-4">SignLearn</h3>
            <p className="text-gray-300 mb-4">
              Empowering communication through advanced sign language technology.
            </p>
            <div className="flex space-x-4">
              <div className="w-8 h-8 bg-brand-orange rounded-full flex items-center justify-center">
                <span className="text-white text-sm">F</span>
              </div>
              <div className="w-8 h-8 bg-brand-orange rounded-full flex items-center justify-center">
                <span className="text-white text-sm">T</span>
              </div>
              <div className="w-8 h-8 bg-brand-orange rounded-full flex items-center justify-center">
                <span className="text-white text-sm">I</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="col-span-1">
            <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li><a href="/" className="text-gray-300 hover:text-brand-orange transition-colors">Home</a></li>
              <li><a href="/sign-recognition" className="text-gray-300 hover:text-brand-orange transition-colors">Sign Recognition</a></li>
              <li><a href="/custom-training" className="text-gray-300 hover:text-brand-orange transition-colors">Custom Training</a></li>
              <li><a href="/learning" className="text-gray-300 hover:text-brand-orange transition-colors">Learning</a></li>
            </ul>
          </div>

          {/* Support */}
          <div className="col-span-1">
            <h4 className="text-lg font-semibold mb-4">Support</h4>
            <ul className="space-y-2">
              <li><a href="/help" className="text-gray-300 hover:text-brand-orange transition-colors">Help Center</a></li>
              <li><a href="/contact" className="text-gray-300 hover:text-brand-orange transition-colors">Contact Us</a></li>
              <li><a href="/privacy" className="text-gray-300 hover:text-brand-orange transition-colors">Privacy Policy</a></li>
              <li><a href="/terms" className="text-gray-300 hover:text-brand-orange transition-colors">Terms of Service</a></li>
            </ul>
          </div>

          {/* Newsletter */}
          <div className="col-span-1">
            <h4 className="text-lg font-semibold mb-4">Stay Updated</h4>
            <p className="text-gray-300 mb-4">
              Subscribe to our newsletter for the latest updates.
            </p>
            <div className="flex">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-2 rounded-l-lg text-brand-dark"
              />
              <button className="bg-brand-orange px-6 py-2 rounded-r-lg hover:bg-orange-600 transition-colors">
                Subscribe
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-700 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-300 text-sm">
            © 2024 SignLearn. All rights reserved.
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a href="/privacy" className="text-gray-300 hover:text-brand-orange transition-colors text-sm">Privacy</a>
            <a href="/terms" className="text-gray-300 hover:text-brand-orange transition-colors text-sm">Terms</a>
            <a href="/cookies" className="text-gray-300 hover:text-brand-orange transition-colors text-sm">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
