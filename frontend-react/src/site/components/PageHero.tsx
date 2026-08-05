import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

export const PageHero = ({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: ReactNode;
  body: ReactNode;
}) => (
  <section className="relative overflow-hidden pt-36 pb-16 sm:pt-44">
    <div className="site-container relative">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-[760px]"
      >
        <div className="eyebrow">{eyebrow}</div>
        <h1 className="mt-4 font-display text-[40px] font-extrabold leading-[1.08] tracking-[-0.03em] sm:text-[54px]">
          {title}
        </h1>
        <p className="lede mt-6 max-w-[620px] text-[17px]">{body}</p>
      </motion.div>
    </div>
  </section>
);
