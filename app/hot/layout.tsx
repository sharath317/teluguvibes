import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'హాట్ & ట్రెండింగ్ | Hot & Trending - TeluguVibes',
  description: 'Latest hot photos, glamour photoshoots, and trending social media content from Telugu actresses and anchors.',
  // Note: This section is ad-free to comply with content policies
};

export default function HotLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="hot-section" data-no-ads="true" data-ad-free="true">
      {/*
        AD-FREE SECTION
        This layout explicitly excludes AdSense slots to:
        1. Comply with AdSense content policies for glamour content
        2. Provide a clean, immersive viewing experience
        3. Avoid any monetization policy violations
      */}
      {children}

      {/* NO AdSense containers in this section */}
      {/* If you need to add ads later, create a separate monetization strategy */}
    </div>
  );
}



