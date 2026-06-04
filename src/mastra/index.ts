import 'dotenv/config';
import { Mastra } from '@mastra/core/mastra';
import { travelAgent } from './agents/travel-agent';

import 'dotenv/config';

export const mastra = new Mastra({
  agents: {
    travel: travelAgent,
  },
});