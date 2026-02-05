import { tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { getAllDriveClients } from '../../services/gmail.js';

const listDriveFilesSchema = {
  query: z.string().optional().describe('Search query to find specific files (e.g., "quarterly report", "budget 2024"). Leave empty to list recent files.'),
  fileType: z.enum(['pdf', 'document', 'spreadsheet', 'presentation', 'image', 'any']).optional().default('any').describe('Filter by file type'),
  maxResults: z.number().optional().default(10).describe('Maximum number of files to return'),
};

export const listDriveFilesTool = (userId: string) => tool(
  'list_drive_files',
  `Search and list files in the user's Google Drive. Use this when the user wants to find a file to attach to an email, or wants to see what files they have. You can search by name, type, or browse recent files. Returns file ID, name, type, and size for each file.`,
  listDriveFilesSchema,
  async (args) => {
    try {
      const { query, fileType, maxResults } = args as { query?: string; fileType?: string; maxResults?: number };
      const driveClients = await getAllDriveClients(userId);

      if (driveClients.length === 0) {
        return { content: [{ type: 'text' as const, text: JSON.stringify({ error: 'No Google accounts connected. Please connect your Google account first.' }) }], isError: true };
      }

      const allFiles: Array<{
        id: string;
        name: string;
        mimeType: string;
        size: string;
        modifiedTime: string;
        account: string;
      }> = [];

      // Build the query string
      let q = 'trashed = false';

      if (query) {
        q += ` and name contains '${query.replace(/'/g, "\\'")}'`;
      }

      // Filter by file type
      const mimeTypeFilters: Record<string, string> = {
        'pdf': "mimeType = 'application/pdf'",
        'document': "mimeType = 'application/vnd.google-apps.document' or mimeType = 'application/msword' or mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'",
        'spreadsheet': "mimeType = 'application/vnd.google-apps.spreadsheet' or mimeType = 'application/vnd.ms-excel' or mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'",
        'presentation': "mimeType = 'application/vnd.google-apps.presentation' or mimeType = 'application/vnd.ms-powerpoint' or mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'",
        'image': "mimeType contains 'image/'",
      };

      if (fileType && fileType !== 'any' && mimeTypeFilters[fileType]) {
        q += ` and (${mimeTypeFilters[fileType]})`;
      }

      for (const { email, client } of driveClients) {
        try {
          const response = await client.files.list({
            q,
            pageSize: maxResults || 10,
            fields: 'files(id, name, mimeType, size, modifiedTime)',
            orderBy: 'modifiedTime desc',
          });

          const files = response.data.files || [];

          for (const file of files) {
            allFiles.push({
              id: file.id || '',
              name: file.name || 'Unnamed',
              mimeType: file.mimeType || 'unknown',
              size: file.size ? formatFileSize(parseInt(file.size)) : 'Unknown size',
              modifiedTime: file.modifiedTime || '',
              account: email,
            });
          }
        } catch (error) {
          console.error(`Error fetching Drive files from ${email}:`, error);
        }
      }

      if (allFiles.length === 0) {
        const result = {
          files: [],
          total: 0,
          message: query
            ? `No files found matching "${query}"`
            : 'No files found in Drive'
        };
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      }

      const result = {
        files: allFiles,
        total: allFiles.length,
        message: `Found ${allFiles.length} file(s)${query ? ` matching "${query}"` : ''}`
      };
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      return { content: [{ type: 'text' as const, text: `Error: Failed to list Drive files: ${errorMsg}` }], isError: true };
    }
  }
);

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
