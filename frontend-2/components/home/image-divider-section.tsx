export default function ImageDividerSection() {
  return (
    <div className="relative h-[400px] lg:h-[500px] overflow-hidden">
      {/* Parallax image background */}
      <div className="absolute inset-0">
        <img 
          src="https://images.unsplash.com/photo-1545389336-cf090694435e?w=1920&h=800&fit=crop"
          alt="Peaceful meditation space"
          className="w-full h-full object-cover scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-olive-900/20 to-cream-50" />
      </div>
      
      {/* Floating quote */}
      <div className="relative h-full flex items-center justify-center">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 lg:p-12 shadow-2xl animate-fade-in">
            <h3 className="text-2xl lg:text-3xl font-medium text-olive-900 mb-4">
              "Wellness is not a destination, but a journey of 
              <span className="text-gradient bg-gradient-to-r from-sage-600 to-terracotta-600 bg-clip-text text-transparent"> continuous growth"</span>
            </h3>
            <p className="text-olive-600">Join thousands who have transformed their lives through Estuary</p>
          </div>
        </div>
      </div>
    </div>
  )
}