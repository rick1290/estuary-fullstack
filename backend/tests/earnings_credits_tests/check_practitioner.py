"""Check practitioner 5 and their services."""
from practitioners.models import Practitioner
from services.models import Service

# Check practitioner 5
try:
    prac = Practitioner.objects.get(id=5)
    print(f'Practitioner 5: {prac.display_name}')
    print(f'  User: {prac.user.email}')
    print()

    # Get their services
    services = Service.objects.filter(primary_practitioner=prac, is_active=True)
    print(f'Active services ({services.count()}):')
    for s in services:
        print(f'  - ID {s.id}: {s.name} ({s.service_type.code if s.service_type else "no type"}) - ${s.price}')
except Practitioner.DoesNotExist:
    print('Practitioner 5 not found')
    # List available practitioners
    pracs = Practitioner.objects.all()[:10]
    print(f'\nAvailable practitioners ({pracs.count()}):')
    for p in pracs:
        print(f'  - ID {p.id}: {p.display_name}')
