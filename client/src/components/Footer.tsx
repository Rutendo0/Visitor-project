export default function Footer() {
  return (
    <footer className="bg-neutral-700 text-white mt-8">
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-medium mb-3">National Archives of Zimbabwe</h3>
            <p className="text-neutral-300 text-sm">Preserving the nation's documentary heritage for present and future generations.</p>
          </div>
          <div>
            <h3 className="text-lg font-medium mb-3">Contact</h3>
            <p className="text-neutral-300 text-sm">Borrowdale Road, Harare</p>
            <p className="text-neutral-300 text-sm">Tel: +263-242-792741/2</p>
            <p className="text-neutral-300 text-sm">Email: info@nationalarchives.gov.zw</p>
          </div>
          <div>
            <h3 className="text-lg font-medium mb-3">Hours</h3>
            <p className="text-neutral-300 text-sm">Monday - Friday: 8:00 AM - 4:30 PM</p>
            <p className="text-neutral-300 text-sm">Saturday: 8:00 AM - 12:30 PM</p>
            <p className="text-neutral-300 text-sm">Closed on Sundays and Public Holidays</p>
          </div>
        </div>
        <div className="mt-6 pt-6 border-t border-neutral-600 text-center text-neutral-400 text-sm">
          &copy; {new Date().getFullYear()} National Archives of Zimbabwe. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
