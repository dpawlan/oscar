import { z } from 'zod';
import { searchRequest } from '../clay-client.js';

export const getContactSchema = {
  contact_id: z.string().describe('The ID of the contact to retrieve'),
};

export type GetContactInput = z.infer<z.ZodObject<typeof getContactSchema>>;

interface ClayContact {
  id: string;
  displayName: string;
  firstName: string;
  lastName: string;
  fullName: string;
  title: string;
  organization: string;
  headline: string;
  byline: string;
  bio: string;
  location: string;
  avatarURL: string;
  birthday: { month: number; day: number } | null;
  relationship: string;
  score: number;
  notes: Array<{
    id: number;
    content: string;
    created: number;
    updated: number;
  }>;
  lists: Array<{
    listID: number;
    listTitle: string;
    listColor: string;
  }>;
  organizations: Array<{
    name: string;
    title: string;
    isPrimary?: boolean;
    start?: { month: number; year: number };
    end?: { month: number; year: number } | null;
  }>;
  educations: Array<{
    name: string;
    degree: string;
    start?: { month: number | null; year: number };
    end?: { month: number | null; year: number };
  }>;
  information: Array<{
    type: string;
    value: string;
    source: string;
    primary: boolean;
  }>;
  interests: Array<{
    n: string;
    s: number;
    c: string;
  }>;
  linkedinURL: string;
  twitterURL: string;
  facebookURL: string;
  instagramURL: string;
  websites: string[];
  integrations: string[];
  lastInteractionDate: number;
  firstInteractionDate: number;
  lastEmailDate: number;
  lastMessageDate: number;
  lastMeetingDate: number;
  numberOfEmailInteractions: number;
  numberOfMessages: number;
  numberOfMeetings: number;
  isClayUser: boolean;
  [key: string]: unknown;
}

export async function getContact(args: GetContactInput): Promise<string> {
  const contact = await searchRequest<ClayContact>(`/contact/${args.contact_id}`);

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
    contactInfo: contact.information?.map(info => ({
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
    notes: contact.notes?.map(note => ({
      id: note.id,
      content: note.content,
      created: new Date(note.created * 1000).toISOString(),
      updated: new Date(note.updated * 1000).toISOString(),
    })),
    interests: contact.interests?.map(i => i.n),
    interactions: {
      lastInteraction: contact.lastInteractionDate ? new Date(contact.lastInteractionDate * 1000).toISOString() : null,
      firstInteraction: contact.firstInteractionDate ? new Date(contact.firstInteractionDate * 1000).toISOString() : null,
      lastEmail: contact.lastEmailDate ? new Date(contact.lastEmailDate * 1000).toISOString() : null,
      lastMessage: contact.lastMessageDate ? new Date(contact.lastMessageDate * 1000).toISOString() : null,
      lastMeeting: contact.lastMeetingDate ? new Date(contact.lastMeetingDate * 1000).toISOString() : null,
      emailCount: contact.numberOfEmailInteractions,
      messageCount: contact.numberOfMessages,
      meetingCount: contact.numberOfMeetings,
    },
    isClayUser: contact.isClayUser,
    integrations: contact.integrations,
  };

  return JSON.stringify(formatted, null, 2);
}
