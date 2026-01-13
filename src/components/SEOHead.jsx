import { Helmet } from 'react-helmet-async'

/**
 * SEOHead Component
 * Comprehensive SEO and social media meta tags component
 * Supports Open Graph, Twitter Cards, and standard SEO meta tags
 */
function SEOHead({
  title,
  description,
  url,
  image,
  type = 'website',
  siteName = 'USAHUDhomes.com',
  twitterHandle = '@usahudhomes',
  keywords,
  author = 'USAHUDhomes.com',
  publishedTime,
  modifiedTime,
  section,
  tags,
  price,
  currency = 'USD',
  availability = 'instock',
  locale = 'en_US',
  canonical
}) {
  // Ensure absolute URLs
  const absoluteUrl = url?.startsWith('http') ? url : `https://usahudhomes.com${url || ''}`
  const absoluteImage = image?.startsWith('http') ? image : image ? `https://usahudhomes.com${image}` : 'https://usahudhomes.com/images/og-default.jpg'
  const canonicalUrl = canonical || absoluteUrl

  // Default fallback image if none provided
  const ogImage = absoluteImage || 'https://usahudhomes.com/images/og-default.jpg'

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{title}</title>
      <meta name="title" content={title} />
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      {author && <meta name="author" content={author} />}
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={absoluteUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:secure_url" content={ogImage} />
      <meta property="og:image:type" content="image/jpeg" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content={locale} />

      {/* Article specific tags */}
      {type === 'article' && publishedTime && (
        <meta property="article:published_time" content={publishedTime} />
      )}
      {type === 'article' && modifiedTime && (
        <meta property="article:modified_time" content={modifiedTime} />
      )}
      {type === 'article' && section && (
        <meta property="article:section" content={section} />
      )}
      {type === 'article' && tags && tags.map((tag, index) => (
        <meta key={index} property="article:tag" content={tag} />
      ))}

      {/* Product specific tags (for property listings) */}
      {price && (
        <>
          <meta property="product:price:amount" content={price} />
          <meta property="product:price:currency" content={currency} />
          <meta property="product:availability" content={availability} />
        </>
      )}

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={absoluteUrl} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      {twitterHandle && <meta name="twitter:site" content={twitterHandle} />}
      {twitterHandle && <meta name="twitter:creator" content={twitterHandle} />}

      {/* Additional SEO tags */}
      <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      <meta name="googlebot" content="index, follow" />
      <meta name="bingbot" content="index, follow" />
      
      {/* Mobile optimization */}
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
      <meta name="format-detection" content="telephone=yes" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      
      {/* Geo tags for local SEO */}
      <meta name="geo.region" content="US" />
      <meta name="geo.placename" content="United States" />
    </Helmet>
  )
}

export default SEOHead
