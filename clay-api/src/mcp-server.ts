import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { searchRequest, activityRequest, apiRequest } from './clay-client.js';

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: 'clay-api',
    version: '1.0.0',
  });

  // ── clay_search_contacts ──────────────────────────────────────────────
  server.tool(
    'clay_search_contacts',
    'Search for contacts in Clay CRM by name, company, notes, or any other text',
    {
      term: z.string().optional().describe('Search query text to find contacts'),
      limit: z.number().optional().default(50).describe('Maximum number of contacts to return (max 1000)'),
      page: z.number().optional().default(1).describe('Page number for pagination'),
      sort_by: z.enum(['score', 'firstName', 'lastName', 'notes', 'reminders']).optional().default('score').describe('Field to sort results by'),
      sort_direction: z.enum(['asc', 'desc']).optional().default('desc').describe('Sort direction'),
      include_fields: z.string().optional().describe('Comma-separated fields to include in response'),
    },
    async (args) => {
      const params: Record<string, string | number | undefined> = {
        term: args.term,
        limit: args.limit,
        page: args.page,
        sort_by: args.sort_by,
        sort_direction: args.sort_direction,
        include_fields: args.include_fields,
      };
      const response = await searchRequest<{
        took: number;
        hits: { total: number; hits: Array<{ _id: string; _score: number; _source: Record<string, unknown> }> };
      }>('/search', { params });

      const contacts = response.hits.hits.map((hit) => ({
        id: hit._id,
        score: hit._score,
        ...hit._source,
      }));

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ total: response.hits.total, count: contacts.length, took_ms: response.took, contacts }, null, 2),
        }],
      };
    },
  );

  // ── clay_get_contact ──────────────────────────────────────────────────
  server.tool(
    'clay_get_contact',
    'Get detailed information about a specific contact by their ID',
    {
      contact_id: z.string().describe('The ID of the contact to retrieve'),
    },
    async (args) => {
      const contact = await searchRequest<Record<string, unknown>>(`/contact/${args.contact_id}`);

      const formatted = {
        id: contact.id,
        name: contact.displayName || contact.fullName,
        firstName: contact.firstName,
        lastName: contact.lastName,
        title: contact.title,
        organization: contact.organization,
        headline: contact.headline,
        bio: contact.bio,
        location: contact.location,
        avatarURL: contact.avatarURL,
        birthday: contact.birthday,
        relationship: contact.relationship,
        score: contact.score,
        contactInfo: (contact.information as Array<{ type: string; value: string }> | undefined)?.map((info) => ({
          type: info.type,
          value: info.value,
        })),
        socialLinks: {
          linkedin: contact.linkedinURL,
          twitter: contact.twitterURL,
          facebook: contact.facebookURL,
          instagram: contact.instagramURL,
        },
        workHistory: contact.organizations,
        education: contact.educations,
        lists: contact.lists,
        notes: (contact.notes as Array<{ id: number; content: string; created: number; updated: number }> | undefined)?.map((note) => ({
          id: note.id,
          content: note.content,
          created: new Date(note.created * 1000).toISOString(),
          updated: new Date(note.updated * 1000).toISOString(),
        })),
        interests: (contact.interests as Array<{ n: string }> | undefined)?.map((i) => i.n),
        interactions: {
          lastInteraction: contact.lastInteractionDate ? new Date((contact.lastInteractionDate as number) * 1000).toISOString() : null,
          firstInteraction: contact.firstInteractionDate ? new Date((contact.firstInteractionDate as number) * 1000).toISOString() : null,
          lastEmail: contact.lastEmailDate ? new Date((contact.lastEmailDate as number) * 1000).toISOString() : null,
          lastMessage: contact.lastMessageDate ? new Date((contact.lastMessageDate as number) * 1000).toISOString() : null,
          lastMeeting: contact.lastMeetingDate ? new Date((contact.lastMeetingDate as number) * 1000).toISOString() : null,
          emailCount: contact.numberOfEmailInteractions,
          messageCount: contact.numberOfMessages,
          meetingCount: contact.numberOfMeetings,
        },
        isClayUser: contact.isClayUser,
        integrations: contact.integrations,
      };

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(formatted, null, 2) }],
      };
    },
  );

  // ── clay_get_contacts_bulk ────────────────────────────────────────────
  server.tool(
    'clay_get_contacts_bulk',
    'Get information for multiple contacts at once by their IDs',
    {
      contact_ids: z.array(z.number()).describe('Array of numeric contact IDs to retrieve'),
      fields: z.array(z.string()).optional().describe('Array of fields to include (all fields returned by default)'),
    },
    async (args) => {
      const body: Record<string, unknown> = { contact_ids: args.contact_ids };
      if (args.fields && args.fields.length > 0) {
        body.fields = args.fields;
      }
      const contacts = await searchRequest<Array<Record<string, unknown>>>('/contacts/bulk/', {
        method: 'POST',
        body,
      });

      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ count: contacts.length, contacts }, null, 2) }],
      };
    },
  );

  // ── clay_get_activity ─────────────────────────────────────────────────
  server.tool(
    'clay_get_activity',
    'Get activity feed with social posts, news, events, and updates from your contacts',
    {
      limit: z.number().optional().default(100).describe('Maximum number of activity items to return (max 1000)'),
      after: z.number().optional().describe("Unix timestamp for pagination - use the last item's itemDate value"),
      type: z.string().optional().describe('Comma-separated types to filter (event, birthday, import, new-member, reconnect, reminder, shared, news, announcement, post, diff)'),
      contacts: z.string().optional().describe('Comma-separated contact IDs to filter by'),
      groups: z.string().optional().describe('Comma-separated group IDs to filter by'),
      status: z.enum(['all', 'dismissed', 'active']).optional().default('active').describe('Activity status filter'),
    },
    async (args) => {
      const params: Record<string, string | number | undefined> = {
        limit: args.limit,
        after: args.after,
        type: args.type,
        contacts: args.contacts,
        groups: args.groups,
        status: args.status,
      };

      const response = await activityRequest<{
        total: number;
        results: Array<{
          id: string;
          itemType: string;
          itemDate: number;
          status: string;
          seen: boolean;
          metadata: {
            contact?: { id: string; displayName: string; avatarURL: string };
            content?: string;
            source?: string;
            link?: string;
            title?: string;
            metrics?: { likes?: number; shares?: number; comments?: number };
          };
        }>;
      }>('/activity', { params });

      const activities = response.results.map((item) => ({
        id: item.id,
        type: item.itemType,
        date: new Date(item.itemDate * 1000).toISOString(),
        status: item.status,
        seen: item.seen,
        contact: item.metadata.contact
          ? { id: item.metadata.contact.id, name: item.metadata.contact.displayName, avatarURL: item.metadata.contact.avatarURL }
          : null,
        content: item.metadata.content,
        source: item.metadata.source,
        link: item.metadata.link,
        title: item.metadata.title,
        metrics: item.metadata.metrics,
      }));

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            total: response.total,
            count: activities.length,
            activities,
            nextPageAfter: response.results.length > 0 ? response.results[response.results.length - 1].itemDate : null,
          }, null, 2),
        }],
      };
    },
  );

  // ── clay_get_timeline ─────────────────────────────────────────────────
  server.tool(
    'clay_get_timeline',
    'Get the interaction timeline and history for a specific contact',
    {
      contact_id: z.string().describe('The ID of the contact whose timeline to retrieve'),
    },
    async (args) => {
      const response = await searchRequest<{
        total: number;
        has_next: boolean;
        results: Array<{
          id: string;
          item_type: string;
          source: string;
          item_date: string;
          content: string;
          users: Array<{ name: string; email: string; is_self: boolean }>;
          metadata: { title?: string; link?: string; links?: Record<string, string>; is_upcoming?: boolean };
        }>;
        pagination_date: string;
        pagination_item_id: string;
      }>(`/contacts/${args.contact_id}/timeline`);

      const timeline = response.results.map((item) => ({
        id: item.id,
        type: item.item_type,
        source: item.source,
        date: item.item_date,
        content: item.content,
        title: item.metadata.title,
        link: item.metadata.link || item.metadata.links?.url,
        isUpcoming: item.metadata.is_upcoming,
        users: item.users.map((u) => ({ name: u.name, email: u.email, isSelf: u.is_self })),
      }));

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            total: response.total,
            hasMore: response.has_next,
            timeline,
            pagination: { date: response.pagination_date, itemId: response.pagination_item_id },
          }, null, 2),
        }],
      };
    },
  );

  // ── clay_add_note ─────────────────────────────────────────────────────
  server.tool(
    'clay_add_note',
    'Add a note to a contact in Clay',
    {
      contact_id: z.string().describe('The ID of the contact to add a note to'),
      content: z.string().describe('The content of the note'),
    },
    async (args) => {
      const response = await apiRequest<{
        id: number;
        content: string;
        created: string;
        updated: string;
        contact: number;
      }>(`/v1/network/contacts/${args.contact_id}/notes`, {
        method: 'POST',
        body: { content: args.content },
      });

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            note: { id: response.id, content: response.content, created: response.created, updated: response.updated, contactId: response.contact },
          }, null, 2),
        }],
      };
    },
  );

  // ── clay_create_contact ───────────────────────────────────────────────
  server.tool(
    'clay_create_contact',
    'Create a new contact in Clay from an email, social URL, phone, or name',
    {
      person_lookup: z.string().describe('Value to create contact from (email, LinkedIn URL, Twitter handle, phone, or name)'),
      lookup_type: z.enum(['email', 'twitter', 'linkedin', 'facebook', 'url', 'phone', 'manual']).optional().describe('Type of the person_lookup value (auto-detected if not specified)'),
      first_name: z.string().optional().describe('First name of the contact'),
      last_name: z.string().optional().describe('Last name of the contact'),
    },
    async (args) => {
      const body: Record<string, string | undefined> = {
        person_lookup: args.person_lookup,
      };
      if (args.lookup_type) body.lookup_type = args.lookup_type;
      if (args.first_name) body.first_name = args.first_name;
      if (args.last_name) body.last_name = args.last_name;

      const response = await apiRequest<{
        id: number;
        display_name: string;
        first_name: string;
        last_name: string;
        full_name: string;
        lookup_type: string;
        person_lookup: string;
        avatar_url: string;
        created: string;
        source: string;
        is_clay_user: boolean;
        information: Array<{ id: number; type: string; value: string; source: string; label: string | null }>;
      }>('/v1/network/contacts/', { method: 'POST', body });

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            contact: {
              id: response.id,
              displayName: response.display_name,
              firstName: response.first_name,
              lastName: response.last_name,
              fullName: response.full_name,
              lookupType: response.lookup_type,
              personLookup: response.person_lookup,
              avatarURL: response.avatar_url,
              created: response.created,
              source: response.source,
              isClayUser: response.is_clay_user,
              information: response.information,
            },
          }, null, 2),
        }],
      };
    },
  );

  // ── clay_enrich_email ─────────────────────────────────────────────────
  server.tool(
    'clay_enrich_email',
    'Look up profile information for an email address including name, bio, location, and social links',
    {
      email: z.string().describe('Email address to look up and enrich'),
    },
    async (args) => {
      const response = await apiRequest<{
        name: string;
        bio: string;
        location: string;
        avatar: string;
        links: Array<{ url: string; title: string }>;
      }>(`/v2/profile-lookup/?email=${encodeURIComponent(args.email)}`);

      const isEmpty = !response.name && !response.bio && !response.location &&
        !response.avatar && (!response.links || response.links.length === 0);

      if (isEmpty) {
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({ found: false, email: args.email, message: 'No profile information found for this email address' }, null, 2),
          }],
        };
      }

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

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            found: true,
            email: args.email,
            profile: { name: response.name, bio: response.bio, location: response.location, avatar: response.avatar, socialLinks, otherLinks },
          }, null, 2),
        }],
      };
    },
  );

  return server;
}
