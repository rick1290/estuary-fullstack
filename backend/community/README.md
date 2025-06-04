# Estuary Community Feature

The Estuary Community feature provides a social platform for practitioners to share content with users. It includes posts, comments, reactions, follows, and topics (hashtags).

## Features

- **Posts**: Practitioners can create posts with different visibility settings:
  - Public: Visible to all users
  - Private: Visible only to users who have made a purchase
  - Followers: Visible only to users who follow the practitioner

- **Comments**: Users can comment on posts and reply to other comments

- **Reactions**: Users can like or heart posts

- **Follows**: Users can follow practitioners to see their follower-only content

- **Topics/Hashtags**: Posts can be categorized with topics for better discoverability

- **Admin Controls**: Moderation tools for pinning, featuring, and archiving content

## API Endpoints

### Posts

- `GET /api/v1/community/posts/` - List posts (with filtering options)
- `POST /api/v1/community/posts/` - Create a new post
- `GET /api/v1/community/posts/{id}/` - Get post details
- `PUT/PATCH /api/v1/community/posts/{id}/` - Update a post
- `DELETE /api/v1/community/posts/{id}/` - Delete a post
- `POST /api/v1/community/posts/{id}/react/` - React to a post (like/heart)
- `POST /api/v1/community/posts/{id}/unreact/` - Remove reaction from a post

### Comments

- `GET /api/v1/community/comments/` - List comments (with filtering options)
- `POST /api/v1/community/comments/` - Create a new comment
- `GET /api/v1/community/comments/{id}/` - Get comment details
- `PUT/PATCH /api/v1/community/comments/{id}/` - Update a comment
- `DELETE /api/v1/community/comments/{id}/` - Delete a comment

### Follows

- `GET /api/v1/community/follows/` - List user's follows
- `POST /api/v1/community/follows/` - Follow a practitioner
- `DELETE /api/v1/community/follows/unfollow/?practitioner={id}` - Unfollow a practitioner

### Topics

- `GET /api/v1/community/topics/` - List topics
- `POST /api/v1/community/topics/` - Create a new topic
- `GET /api/v1/community/topics/{id}/` - Get topic details
- `PUT/PATCH /api/v1/community/topics/{id}/` - Update a topic
- `DELETE /api/v1/community/topics/{id}/` - Delete a topic
- `GET /api/v1/community/topics/{id}/posts/` - Get posts with this topic

## Setting Up in Next.js

### 1. API Client Setup

Create API client functions using Axios or the built-in fetch API:

```typescript
// api/community.ts
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Configure axios with authentication
const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// Add authentication interceptor
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Posts
export const getPosts = async (filters = {}) => {
  const response = await apiClient.get('/api/v1/community/posts/', { params: filters });
  return response.data;
};

export const getPost = async (id) => {
  const response = await apiClient.get(`/api/v1/community/posts/${id}/`);
  return response.data;
};

export const createPost = async (postData) => {
  const response = await apiClient.post('/api/v1/community/posts/', postData);
  return response.data;
};

export const updatePost = async (id, postData) => {
  const response = await apiClient.patch(`/api/v1/community/posts/${id}/`, postData);
  return response.data;
};

export const deletePost = async (id) => {
  return await apiClient.delete(`/api/v1/community/posts/${id}/`);
};

export const reactToPost = async (id, reactionType) => {
  const response = await apiClient.post(`/api/v1/community/posts/${id}/react/`, {
    reaction_type: reactionType
  });
  return response.data;
};

export const removeReaction = async (id) => {
  return await apiClient.post(`/api/v1/community/posts/${id}/unreact/`);
};

// Comments
export const getComments = async (filters = {}) => {
  const response = await apiClient.get('/api/v1/community/comments/', { params: filters });
  return response.data;
};

export const createComment = async (commentData) => {
  const response = await apiClient.post('/api/v1/community/comments/', commentData);
  return response.data;
};

// Follows
export const followPractitioner = async (practitionerId) => {
  const response = await apiClient.post('/api/v1/community/follows/', {
    practitioner_id: practitionerId
  });
  return response.data;
};

export const unfollowPractitioner = async (practitionerId) => {
  return await apiClient.delete(`/api/v1/community/follows/unfollow/?practitioner=${practitionerId}`);
};

// Topics
export const getTopics = async (filters = {}) => {
  const response = await apiClient.get('/api/v1/community/topics/', { params: filters });
  return response.data;
};

export const getPostsByTopic = async (topicId, filters = {}) => {
  const response = await apiClient.get(`/api/v1/community/topics/${topicId}/posts/`, { params: filters });
  return response.data;
};
```

### 2. React Query Integration

For efficient data fetching and caching, use React Query:

```bash
npm install @tanstack/react-query
```

Set up the React Query provider in your `_app.tsx`:

```tsx
// pages/_app.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

function MyApp({ Component, pageProps }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <Component {...pageProps} />
    </QueryClientProvider>
  );
}

export default MyApp;
```

### 3. Create React Hooks

Create custom hooks for community features:

```typescript
// hooks/useCommunity.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as communityApi from '../api/community';

// Posts
export const usePosts = (filters = {}) => {
  return useQuery(['posts', filters], () => communityApi.getPosts(filters));
};

export const usePost = (id) => {
  return useQuery(['post', id], () => communityApi.getPost(id), {
    enabled: !!id,
  });
};

export const useCreatePost = () => {
  const queryClient = useQueryClient();
  
  return useMutation(communityApi.createPost, {
    onSuccess: () => {
      queryClient.invalidateQueries(['posts']);
    },
  });
};

export const useUpdatePost = (id) => {
  const queryClient = useQueryClient();
  
  return useMutation((data) => communityApi.updatePost(id, data), {
    onSuccess: () => {
      queryClient.invalidateQueries(['posts']);
      queryClient.invalidateQueries(['post', id]);
    },
  });
};

export const useDeletePost = () => {
  const queryClient = useQueryClient();
  
  return useMutation(communityApi.deletePost, {
    onSuccess: () => {
      queryClient.invalidateQueries(['posts']);
    },
  });
};

export const useReactToPost = () => {
  const queryClient = useQueryClient();
  
  return useMutation(
    ({ postId, reactionType }) => communityApi.reactToPost(postId, reactionType),
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries(['post', variables.postId]);
        queryClient.invalidateQueries(['posts']);
      },
    }
  );
};

// Comments
export const useComments = (filters = {}) => {
  return useQuery(['comments', filters], () => communityApi.getComments(filters));
};

export const useCreateComment = () => {
  const queryClient = useQueryClient();
  
  return useMutation(communityApi.createComment, {
    onSuccess: (data) => {
      queryClient.invalidateQueries(['comments']);
      queryClient.invalidateQueries(['post', data.post]);
    },
  });
};

// Follows
export const useFollowPractitioner = () => {
  const queryClient = useQueryClient();
  
  return useMutation(communityApi.followPractitioner, {
    onSuccess: () => {
      queryClient.invalidateQueries(['follows']);
    },
  });
};

export const useUnfollowPractitioner = () => {
  const queryClient = useQueryClient();
  
  return useMutation(communityApi.unfollowPractitioner, {
    onSuccess: () => {
      queryClient.invalidateQueries(['follows']);
    },
  });
};

// Topics
export const useTopics = (filters = {}) => {
  return useQuery(['topics', filters], () => communityApi.getTopics(filters));
};

export const usePostsByTopic = (topicId, filters = {}) => {
  return useQuery(
    ['topicPosts', topicId, filters],
    () => communityApi.getPostsByTopic(topicId, filters),
    {
      enabled: !!topicId,
    }
  );
};
```

### 4. Create UI Components

#### Post Feed Component

```tsx
// components/community/PostFeed.tsx
import { useState } from 'react';
import { usePosts } from '../../hooks/useCommunity';
import PostCard from './PostCard';
import TopicFilter from './TopicFilter';

const PostFeed = () => {
  const [filters, setFilters] = useState({});
  const { data, isLoading, error } = usePosts(filters);

  const handleTopicFilter = (topicId) => {
    setFilters((prev) => ({ ...prev, topic: topicId }));
  };

  if (isLoading) return <div>Loading posts...</div>;
  if (error) return <div>Error loading posts: {error.message}</div>;

  return (
    <div className="post-feed">
      <TopicFilter onSelectTopic={handleTopicFilter} />
      
      {data?.results?.length === 0 ? (
        <div>No posts found</div>
      ) : (
        data?.results?.map((post) => (
          <PostCard key={post.id} post={post} />
        ))
      )}
    </div>
  );
};

export default PostFeed;
```

#### Post Card Component

```tsx
// components/community/PostCard.tsx
import { useState } from 'react';
import Link from 'next/link';
import { useReactToPost } from '../../hooks/useCommunity';
import TopicTag from './TopicTag';

const PostCard = ({ post }) => {
  const { mutate: reactToPost } = useReactToPost();
  
  const handleReaction = (reactionType) => {
    reactToPost({ postId: post.id, reactionType });
  };

  return (
    <div className="post-card">
      <div className="post-header">
        <img 
          src={post.practitioner.user.profile_picture || '/default-avatar.png'} 
          alt={post.practitioner.display_name}
          className="avatar"
        />
        <div>
          <h3>{post.practitioner.display_name}</h3>
          <span className="post-date">{new Date(post.created_at).toLocaleDateString()}</span>
        </div>
      </div>
      
      {post.title && <h2 className="post-title">{post.title}</h2>}
      
      <div className="post-content">{post.content}</div>
      
      {post.media_url && (
        <div className="post-media">
          {post.media_type === 'image' ? (
            <img src={post.media_url} alt={post.title || 'Post image'} />
          ) : post.media_type === 'video' ? (
            <video src={post.media_url} controls />
          ) : null}
        </div>
      )}
      
      <div className="post-topics">
        {post.topics.map((topic) => (
          <TopicTag key={topic.id} topic={topic} />
        ))}
      </div>
      
      <div className="post-stats">
        <button 
          className={`reaction-btn ${post.user_reaction === 'like' ? 'active' : ''}`}
          onClick={() => handleReaction('like')}
        >
          👍 {post.like_count}
        </button>
        <button 
          className={`reaction-btn ${post.user_reaction === 'heart' ? 'active' : ''}`}
          onClick={() => handleReaction('heart')}
        >
          ❤️ {post.heart_count}
        </button>
        <Link href={`/community/posts/${post.id}`}>
          <a className="comments-link">💬 {post.comment_count} Comments</a>
        </Link>
      </div>
    </div>
  );
};

export default PostCard;
```

#### Topic Filter Component

```tsx
// components/community/TopicFilter.tsx
import { useTopics } from '../../hooks/useCommunity';

const TopicFilter = ({ onSelectTopic }) => {
  const { data, isLoading } = useTopics({ featured: true });

  if (isLoading) return <div>Loading topics...</div>;

  return (
    <div className="topic-filter">
      <h3>Popular Topics</h3>
      <div className="topic-list">
        <button 
          className="topic-tag all"
          onClick={() => onSelectTopic(null)}
        >
          All Posts
        </button>
        
        {data?.results?.map((topic) => (
          <button
            key={topic.id}
            className="topic-tag"
            onClick={() => onSelectTopic(topic.id)}
          >
            #{topic.name} ({topic.post_count})
          </button>
        ))}
      </div>
    </div>
  );
};

export default TopicFilter;
```

#### Create Post Form

```tsx
// components/community/CreatePostForm.tsx
import { useState } from 'react';
import { useCreatePost, useTopics } from '../../hooks/useCommunity';

const CreatePostForm = () => {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    visibility: 'public',
    topic_ids: [],
  });
  
  const { mutate: createPost, isLoading } = useCreatePost();
  const { data: topicsData } = useTopics();
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  
  const handleTopicChange = (e) => {
    const { value, checked } = e.target;
    if (checked) {
      setFormData((prev) => ({
        ...prev,
        topic_ids: [...prev.topic_ids, parseInt(value)],
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        topic_ids: prev.topic_ids.filter((id) => id !== parseInt(value)),
      }));
    }
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    createPost(formData, {
      onSuccess: () => {
        setFormData({
          title: '',
          content: '',
          visibility: 'public',
          topic_ids: [],
        });
      },
    });
  };
  
  return (
    <form className="create-post-form" onSubmit={handleSubmit}>
      <h2>Create a Post</h2>
      
      <div className="form-group">
        <label htmlFor="title">Title (optional)</label>
        <input
          type="text"
          id="title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="Add a title to your post"
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="content">Content</label>
        <textarea
          id="content"
          name="content"
          value={formData.content}
          onChange={handleChange}
          placeholder="What's on your mind?"
          required
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="visibility">Visibility</label>
        <select
          id="visibility"
          name="visibility"
          value={formData.visibility}
          onChange={handleChange}
        >
          <option value="public">Public</option>
          <option value="followers">Followers Only</option>
          <option value="private">Private (Purchasers Only)</option>
        </select>
      </div>
      
      <div className="form-group">
        <label>Topics</label>
        <div className="topics-checkboxes">
          {topicsData?.results?.map((topic) => (
            <div key={topic.id} className="topic-checkbox">
              <input
                type="checkbox"
                id={`topic-${topic.id}`}
                name="topic_ids"
                value={topic.id}
                checked={formData.topic_ids.includes(topic.id)}
                onChange={handleTopicChange}
              />
              <label htmlFor={`topic-${topic.id}`}>#{topic.name}</label>
            </div>
          ))}
        </div>
        <p className="help-text">
          You can also use hashtags in your content (e.g., #wellness) to automatically add topics.
        </p>
      </div>
      
      <button type="submit" className="submit-btn" disabled={isLoading}>
        {isLoading ? 'Posting...' : 'Create Post'}
      </button>
    </form>
  );
};

export default CreatePostForm;
```

### 5. Create Pages

#### Community Home Page

```tsx
// pages/community/index.tsx
import { useState } from 'react';
import Layout from '../../components/Layout';
import PostFeed from '../../components/community/PostFeed';
import CreatePostForm from '../../components/community/CreatePostForm';
import { useAuth } from '../../hooks/useAuth'; // Implement this hook for user authentication

const CommunityPage = () => {
  const { user, isAuthenticated } = useAuth();
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  const isPractitioner = user?.is_practitioner;
  
  return (
    <Layout title="Community">
      <div className="community-page">
        <div className="community-header">
          <h1>Community</h1>
          {isPractitioner && (
            <button 
              className="create-post-btn"
              onClick={() => setShowCreateForm(!showCreateForm)}
            >
              {showCreateForm ? 'Cancel' : 'Create Post'}
            </button>
          )}
        </div>
        
        {showCreateForm && <CreatePostForm />}
        
        <PostFeed />
      </div>
    </Layout>
  );
};

export default CommunityPage;
```

#### Post Detail Page

```tsx
// pages/community/posts/[id].tsx
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';
import { usePost, useComments, useCreateComment } from '../../../hooks/useCommunity';
import PostCard from '../../../components/community/PostCard';
import { useState } from 'react';

const PostDetailPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const [commentText, setCommentText] = useState('');
  
  const { data: post, isLoading: postLoading } = usePost(id);
  const { data: commentsData, isLoading: commentsLoading } = useComments({ post: id, parent: 'null' });
  const { mutate: createComment } = useCreateComment();
  
  const handleSubmitComment = (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    
    createComment({
      post: id,
      content: commentText,
    }, {
      onSuccess: () => {
        setCommentText('');
      },
    });
  };
  
  if (postLoading) return <div>Loading post...</div>;
  if (!post) return <div>Post not found</div>;
  
  return (
    <Layout title={post.title || 'Post Detail'}>
      <div className="post-detail-page">
        <PostCard post={post} />
        
        <div className="comments-section">
          <h2>Comments ({post.comment_count})</h2>
          
          <form className="comment-form" onSubmit={handleSubmitComment}>
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment..."
              required
            />
            <button type="submit">Post Comment</button>
          </form>
          
          {commentsLoading ? (
            <div>Loading comments...</div>
          ) : (
            <div className="comments-list">
              {commentsData?.results?.map((comment) => (
                <div key={comment.id} className="comment">
                  <div className="comment-header">
                    <img 
                      src={comment.user.profile_picture || '/default-avatar.png'} 
                      alt={comment.user.full_name}
                      className="avatar small"
                    />
                    <span className="user-name">{comment.user.full_name}</span>
                    <span className="comment-date">
                      {new Date(comment.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="comment-content">{comment.content}</div>
                  
                  {comment.reply_count > 0 && (
                    <div className="replies">
                      <h4>Replies ({comment.reply_count})</h4>
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="reply">
                          <div className="comment-header">
                            <img 
                              src={reply.user.profile_picture || '/default-avatar.png'} 
                              alt={reply.user.full_name}
                              className="avatar small"
                            />
                            <span className="user-name">{reply.user.full_name}</span>
                            <span className="comment-date">
                              {new Date(reply.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="comment-content">{reply.content}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default PostDetailPage;
```

### 6. Styling

Create a CSS module or use a CSS-in-JS solution like styled-components. Here's an example using CSS modules:

```css
/* styles/Community.module.css */
.postFeed {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-top: 20px;
}

.postCard {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 20px;
}

.postHeader {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 15px;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.avatar.small {
  width: 30px;
  height: 30px;
}

.postTitle {
  font-size: 1.5rem;
  margin-bottom: 10px;
}

.postContent {
  margin-bottom: 15px;
  white-space: pre-wrap;
}

.postMedia img,
.postMedia video {
  max-width: 100%;
  border-radius: 8px;
  margin-bottom: 15px;
}

.postTopics {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 15px;
}

.topicTag {
  background: #f0f2f5;
  color: #1877f2;
  padding: 4px 10px;
  border-radius: 16px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.2s;
}

.topicTag:hover {
  background: #e4e6eb;
}

.postStats {
  display: flex;
  gap: 15px;
  border-top: 1px solid #e4e6eb;
  padding-top: 15px;
}

.reactionBtn {
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: 4px;
  transition: background 0.2s;
}

.reactionBtn:hover {
  background: #f0f2f5;
}

.reactionBtn.active {
  color: #1877f2;
  font-weight: bold;
}

.commentsLink {
  display: flex;
  align-items: center;
  gap: 5px;
  text-decoration: none;
  color: inherit;
}

.commentsSection {
  margin-top: 30px;
}

.commentForm {
  margin-bottom: 20px;
}

.commentForm textarea {
  width: 100%;
  min-height: 80px;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 8px;
  margin-bottom: 10px;
  resize: vertical;
}

.commentForm button {
  background: #1877f2;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.commentsList {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.comment, .reply {
  background: #f0f2f5;
  border-radius: 8px;
  padding: 15px;
}

.reply {
  margin-left: 20px;
  background: #e4e6eb;
}

.commentHeader {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.userName {
  font-weight: bold;
}

.commentDate {
  color: #65676b;
  font-size: 0.8rem;
}

.replies {
  margin-top: 15px;
}

.createPostForm {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 20px;
  margin-bottom: 20px;
}

.formGroup {
  margin-bottom: 15px;
}

.formGroup label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.formGroup input,
.formGroup textarea,
.formGroup select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.formGroup textarea {
  min-height: 120px;
  resize: vertical;
}

.topicsCheckboxes {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 5px;
}

.topicCheckbox {
  display: flex;
  align-items: center;
  gap: 5px;
}

.helpText {
  font-size: 0.8rem;
  color: #65676b;
  margin-top: 5px;
}

.submitBtn {
  background: #1877f2;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.submitBtn:disabled {
  background: #e4e6eb;
  color: #bec3c9;
  cursor: not-allowed;
}

.communityHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.createPostBtn {
  background: #1877f2;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.topicFilter {
  margin-bottom: 20px;
}

.topicList {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 10px;
}
```

## Best Practices

1. **Authentication**: Always include authentication tokens in API requests
2. **Error Handling**: Implement proper error handling for API requests
3. **Loading States**: Show loading indicators during API calls
4. **Optimistic Updates**: Update UI optimistically for better user experience
5. **Pagination**: Implement pagination for post and comment lists
6. **Responsive Design**: Ensure the UI works well on all device sizes
7. **Accessibility**: Make sure all components are accessible

## Security Considerations

1. **JWT Tokens**: Store tokens securely (HTTP-only cookies when possible)
2. **XSS Protection**: Sanitize user-generated content before rendering
3. **CSRF Protection**: Include CSRF tokens in requests if required
4. **Rate Limiting**: Implement client-side throttling for API requests

## Performance Tips

1. **Code Splitting**: Use Next.js dynamic imports for code splitting
2. **Image Optimization**: Use Next.js Image component for optimized images
3. **Memoization**: Use React.memo and useMemo for expensive components
4. **Virtualization**: For long lists, consider a virtualized list component
5. **Prefetching**: Prefetch data for likely user navigation paths
