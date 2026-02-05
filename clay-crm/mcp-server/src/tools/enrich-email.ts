import { apiRequest } from '../clay-client.js';

export const enrichEmailSchema = {
  type: 'object' as const,
  properties: {
    email: {
      type: 'string',
      description: 'Email address to look up and enrich',
    },
  },
  required: ['email'],
};

interface EnrichEmailArgs {
  email: string;
}

interface EnrichResponse {
  name: string;
  bio: string;
  location: string;
  avatar: string;
  links: Array<{
    url: string;
    title: string;
  }>;
}

export async function enrichEmail(args: EnrichEmailArgs): Promise<string> {
  const response = await apiRequest<EnrichResponse>(
    `/v2/profile-lookup/?email=${encodeURIComponent(args.email)}`
  );

  // Check if response is empty
  const isEmpty = !response.name && !response.bio && !response.location &&
                  !response.avatar && (!response.links || response.links.length === 0);

  if (isEmpty) {
    return JSON.stringify(
      {
        found: false,
        email: args.email,
        message: 'No profile information found for this email address',
      },
      null,
      2
    );
  }

  // Organize links by platform
  const socialLinks: Record<string, string> = {};
  const otherLinks: Array<{ title: string; url: string }> = [];

  for (const link of response.links || []) {
    const platform = link.title.toLowerCase();
    if (['linkedin', 'twitter', 'facebook', 'instagram', 'github', 'medium'].includes(platform)) {
      socialLinks[platform] = link.url;
    } else {
      otherLinks.push(link);
    }
  }

  return JSON.stringify(
    {
      found: true,
      email: args.email,
      profile: {
        name: response.name,
        bio: response.bio,
        location: response.location,
        avatar: response.avatar,
        socialLinks,
        otherLinks,
      },
    },
    null,
    2
  );
}
