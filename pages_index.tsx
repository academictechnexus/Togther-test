import dynamic from 'next/dynamic';
import Head from 'next/head';
const AvatarWidget = dynamic(() => import('../components/AvatarWidget'), { ssr: false });

export default function Home() {
  return (
    <>
      <Head>
        <title>AcademicTechnexus Shop Assistant</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <main>
        <div style={{ padding: 40 }}>
          <h1>Demo storefront page</h1>
          <p>This page demonstrates the avatar widget. In a real Shopify theme you would inject the widget script instead.</p>
        </div>
        <AvatarWidget />
      </main>
    </>
  );
}