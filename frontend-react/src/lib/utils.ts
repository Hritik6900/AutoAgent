/** shadcn's registry components import `cn` from "@/lib/utils", so this path has to
 *  exist for pasted components to resolve. It re-exports the project's existing
 *  implementation rather than defining a second one - two `cn`s that drift apart is a
 *  genuinely annoying class of bug. */
export { cn } from '../utils/cn';
