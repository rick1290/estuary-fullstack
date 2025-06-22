# Streams App

## Overview
The streams app implements a content subscription platform similar to OnlyFans/Patreon. Practitioners can create a stream with tiered subscriptions where they post various types of content (text, images, videos, audio, etc.) that subscribers can access based on their subscription level.

## Key Concepts

### 1. Stream
- **One stream per practitioner** - Each practitioner can have exactly one stream
- **Three fixed tiers**: `free`, `entry`, `premium` (backend values)
- **Customizable tier names** - Practitioners can rename tiers for frontend display
- **Featured streams** - Platform can highlight certain streams
- **Categories and tags** - For discovery and organization

### 2. Subscription Tiers
All streams have three tiers with hierarchical access:

```
Premium Tier ($X/month)
  ↓ Can see all content below
Entry Tier ($Y/month)  
  ↓ Can see all content below
Free Tier ($0)
```

**Key points:**
- Higher tiers can access all lower tier content
- Free tier is always $0
- Entry and Premium tiers have monthly subscription fees
- Each tier can have custom perks/benefits

### 3. Content Types
StreamPost supports multiple content types:
- **Text Post** - Rich text content
- **Image** - Single images
- **Gallery** - Multiple images in one post
- **Video** - Video content (uploaded or external)
- **Audio** - Podcasts, music, meditations
- **Link** - External resources
- **Poll** - Interactive polls

### 4. Access Control
Each post has a `tier_level` that determines minimum subscription needed:
- Posts can have teaser text for lower tiers
- Media can be blurred for preview
- Watermarking option for media

## Models

### Stream
The main container for a practitioner's content:
```python
stream = Stream.objects.create(
    practitioner=practitioner,
    title="Wellness Journey with Jane",
    entry_tier_price_cents=999,  # $9.99/month
    premium_tier_price_cents=2999,  # $29.99/month
    entry_tier_name="Supporter",  # Custom name
    premium_tier_name="VIP Member"  # Custom name
)
```

### StreamPost
Individual content pieces:
```python
post = StreamPost.objects.create(
    stream=stream,
    title="Morning Meditation Guide",
    content="<rich text content>",
    post_type='post',
    tier_level='entry',  # Requires entry tier or above
    teaser_text="Unlock this exclusive meditation guide..."
)

# Add media to post
StreamPostMedia.objects.create(
    post=post,
    media_type='video',
    media_url='https://...',
    order=1
)
```

### StreamSubscription
Manages user subscriptions:
```python
subscription = StreamSubscription.objects.create(
    user=user,
    stream=stream,
    tier='premium',
    stripe_subscription_id='sub_xxx',
    current_period_start=now,
    current_period_end=now + timedelta(days=30)
)
```

## Key Features

### 1. Multiple Media per Post
Posts can have multiple media attachments:
- Images, videos, audio files
- Ordered display
- Captions and alt text
- Different media types in same post

### 2. Engagement Features
- **Likes** - Users can like posts
- **Comments** - Threaded comments with replies
- **Tips** - One-time payments on posts or streams
- **View tracking** - Analytics on post performance

### 3. Content Discovery
- Stream categories
- Tags on streams and posts
- Featured streams
- Preview posts for non-subscribers

### 4. Monetization
- Monthly recurring subscriptions via Stripe
- Tips/donations on individual posts
- Platform commission on all transactions
- Detailed revenue analytics

### 5. Analytics
Daily snapshots track:
- Subscriber growth/churn
- Content performance
- Revenue metrics
- Engagement rates

## Subscription Management

### Stripe Integration (Monthly Subscriptions)
Each Stream has its own Stripe Product with custom pricing:

#### Stream Model Fields:
- `stripe_product_id` - The Stripe Product representing this stream
- `stripe_entry_price_id` - Stripe Price ID for entry tier monthly subscription
- `stripe_premium_price_id` - Stripe Price ID for premium tier monthly subscription
- `entry_tier_price_cents` - Practitioner-set monthly price for entry tier
- `premium_tier_price_cents` - Practitioner-set monthly price for premium tier

#### StreamSubscription Model Fields:
- `stripe_subscription_id` - The Stripe Subscription ID
- `stripe_price_id` - Which specific Price ID this subscription uses
- `price_cents` - Actual price being paid (for price grandfathering)

#### Pricing Flow:
1. Practitioner sets tier prices in cents (e.g., 1500 = $15/month)
2. System creates Stripe Product for the stream
3. System creates two Stripe Prices (entry and premium)
4. Price IDs are stored on the Stream model
5. When user subscribes, use the appropriate Price ID

#### Example Implementation:
```python
# When practitioner sets/updates pricing
stream.entry_tier_price_cents = 1500  # $15/month
stream.premium_tier_price_cents = 3000  # $30/month

# Create Stripe objects
product = stripe.Product.create(
    name=f"{stream.title} Subscription",
    metadata={'stream_id': stream.id}
)
stream.stripe_product_id = product.id

# Create Price objects
entry_price = stripe.Price.create(
    product=stream.stripe_product_id,
    unit_amount=stream.entry_tier_price_cents,
    currency='usd',
    recurring={'interval': 'month'}
)
stream.stripe_entry_price_id = entry_price.id

# When user subscribes
subscription = stripe.Subscription.create(
    customer=user_stripe_customer_id,
    items=[{'price': stream.stripe_entry_price_id}],
    application_fee_percent=15,  # Platform takes 15%
    transfer_data={
        'destination': practitioner.stripe_account_id
    }
)
```

### Upgrading/Downgrading
Users can change tiers with proper proration:
```python
# Upgrade from entry to premium
subscription.previous_tier = subscription.tier
subscription.tier = 'premium'
subscription.tier_changed_at = timezone.now()
subscription.stripe_price_id = stream.stripe_premium_price_id
subscription.price_cents = stream.premium_tier_price_cents
# Update Stripe subscription to new price
```

### Cancellation
Subscriptions continue until period end:
```python
subscription.canceled_at = timezone.now()
subscription.ends_at = subscription.current_period_end
subscription.status = 'canceled'
# Cancel in Stripe but let it run until period end
```

### Price Changes
When practitioner changes tier pricing:
1. Create NEW Stripe Price objects (prices are immutable)
2. Update stream's price IDs
3. Existing subscribers keep old pricing (grandfathered)
4. New subscribers get new pricing

## Content Visibility Rules

1. **Free content** - Visible to everyone (even non-subscribers)
2. **Entry content** - Requires entry or premium subscription
3. **Premium content** - Requires premium subscription
4. **Expired content** - Hidden after expiry date
5. **Preview mode** - Non-subscribers see limited posts with teasers

## Best Practices

### 1. Content Strategy
- Mix of free and paid content
- Regular posting schedule
- Exclusive premium content
- Teasers to convert free users

### 2. Pricing Strategy
- Competitive tier pricing
- Clear value proposition per tier
- Special perks for each level
- Consider platform commission in pricing

### 3. Engagement
- Respond to comments
- Pin important posts
- Use polls for interaction
- Thank supporters with exclusive content

### 4. Media Handling
- Optimize media before upload
- Use appropriate formats
- Add captions for accessibility
- Consider bandwidth costs

## Integration Points

- **Stripe** - Subscription billing and payment processing
- **Storage** - Media files stored in S3/CloudFlare R2
- **Notifications** - New post alerts, subscription updates
- **Analytics** - Track performance and revenue
- **Moderation** - Content flagging and review system

## Security Considerations

1. **Access Control** - Strict tier-based access
2. **Payment Security** - All payments through Stripe
3. **Content Protection** - Watermarking, blur previews
4. **Privacy** - Anonymous tipping option
5. **Moderation** - Report/hide inappropriate content