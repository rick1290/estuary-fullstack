/**
 * Get the correct detail page URL for a service based on its type
 */
export function getServiceDetailUrl(service: {
  id?: string | number;
  public_uuid?: string;
  service_type?: { name?: string; code?: string };
  service_type_code?: string;
  service_type_display?: string;
}): string {
  // Get the service ID (prefer public_uuid)
  const serviceId = service.public_uuid || service.id;
  
  // Get the service type from various possible fields
  const serviceType = 
    service.service_type_code || 
    service.service_type?.code || 
    service.service_type?.name ||
    'session'; // default to session
  
  // Map service types to URL paths
  switch (serviceType.toLowerCase()) {
    case 'session':
      return `/sessions/${serviceId}`;
    case 'workshop':
      return `/workshops/${serviceId}`;
    case 'course':
      return `/courses/${serviceId}`;
    case 'package':
      return `/packages/${serviceId}`;
    case 'bundle':
      return `/bundles/${serviceId}`;
    default:
      // Fallback for unknown types
      return `/services/${serviceId}`;
  }
}

/**
 * Get the CTA button text based on service type
 */
export function getServiceCtaText(serviceType: string): string {
  switch (serviceType?.toLowerCase()) {
    case 'session':
      return 'Book Session';
    case 'workshop':
      return 'Reserve Spot';
    case 'course':
      return 'Start Journey';
    case 'package':
      return 'View Package';
    case 'bundle':
      return 'View Bundle';
    default:
      return 'View Details';
  }
}