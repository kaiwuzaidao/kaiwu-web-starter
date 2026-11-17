import { platform, panel, fallback } from '../mock-support/platform';
import { handlers } from '../mock-support/business';
export default { ...platform, ...panel, ...handlers, ...fallback };
