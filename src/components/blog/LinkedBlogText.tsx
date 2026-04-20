import { Fragment } from 'react';
import { Link } from 'react-router-dom';

type LinkedBlogTextProps = {
  text: string;
};

type LinkMatch = {
  index: number;
  end: number;
  label: string;
  href: string;
  trailingText?: string;
};

const markdownLinkPattern = /\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]+)\)/g;
const labeledUrlPattern = /\b(Lien\s+(?:interne|externe)\s*):\s*(https?:\/\/[^\s),]+|\/[^\s),]+)/gi;
const rawUrlPattern = /(https?:\/\/[^\s),]+|\/(?:blog|tarifs|faq|modules|secteurs|generateur-facture)[^\s),]*)/g;

function cleanHref(value: string) {
  const trailingMatch = value.match(/[.,;!?]+$/);
  const trailingText = trailingMatch?.[0] || '';

  return {
    href: trailingText ? value.slice(0, -trailingText.length) : value,
    trailingText,
  };
}

function getFallbackLabel(href: string) {
  if (href.startsWith('/')) {
    return `factourati.com${href}`;
  }

  try {
    const url = new URL(href);
    return `${url.hostname}${url.pathname === '/' ? '' : url.pathname}`;
  } catch {
    return href;
  }
}

function cleanLinkLabel(label: string, href: string) {
  const cleanedLabel = label.replace(/\s*:\s*Lien\s+(?:interne|externe)\s*$/i, '').trim();
  return cleanedLabel || getFallbackLabel(href);
}

function getTitleBeforeLabeledUrl(text: string, offset: number) {
  const beforeMatch = text.slice(0, offset);
  const lineStart = Math.max(
    beforeMatch.lastIndexOf('\n') + 1,
    beforeMatch.lastIndexOf('.') + 1,
    beforeMatch.lastIndexOf('!') + 1,
    beforeMatch.lastIndexOf('?') + 1,
  );
  const linePrefix = beforeMatch.slice(lineStart);
  const title = linePrefix.replace(/\s*:\s*$/, '').trim();

  if (!title || title.length > 160 || /https?:\/\//i.test(title)) {
    return null;
  }

  const titleOffset = linePrefix.search(/\S/);
  return {
    index: lineStart + (titleOffset < 0 ? 0 : titleOffset),
    label: title,
  };
}

function collectMatches(text: string) {
  const matches: LinkMatch[] = [];

  text.replace(markdownLinkPattern, (match, label: string, href: string, offset: number) => {
    const cleaned = cleanHref(href);
    matches.push({
      index: offset,
      end: offset + match.length,
      label: cleanLinkLabel(label, cleaned.href),
      href: cleaned.href,
      trailingText: cleaned.trailingText,
    });
    return match;
  });

  text.replace(labeledUrlPattern, (match, label: string, href: string, offset: number) => {
    const cleaned = cleanHref(href);
    const titleBeforeLink = getTitleBeforeLabeledUrl(text, offset);

    matches.push({
      index: titleBeforeLink?.index ?? offset,
      end: offset + match.length,
      label: titleBeforeLink?.label ?? cleanLinkLabel(label.replace(/\s*:\s*$/, ''), cleaned.href),
      href: cleaned.href,
      trailingText: cleaned.trailingText,
    });
    return match;
  });

  text.replace(rawUrlPattern, (match, href: string, offset: number) => {
    const cleaned = cleanHref(href);
    matches.push({
      index: offset,
      end: offset + match.length,
      label: getFallbackLabel(cleaned.href),
      href: cleaned.href,
      trailingText: cleaned.trailingText,
    });
    return match;
  });

  return matches
    .sort((a, b) => a.index - b.index || b.end - a.end)
    .filter((match, index, allMatches) => !allMatches.some((other, otherIndex) => otherIndex < index && match.index < other.end));
}

export default function LinkedBlogText({ text }: LinkedBlogTextProps) {
  const parts: Array<string | { label: string; href: string }> = [];
  let lastIndex = 0;

  collectMatches(text).forEach((match) => {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    parts.push({ label: match.label, href: match.href });
    if (match.trailingText) {
      parts.push(match.trailingText);
    }
    lastIndex = match.end;
  });

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return (
    <>
      {parts.map((part, index) => {
        if (typeof part === 'string') {
          return <Fragment key={`${part}-${index}`}>{part}</Fragment>;
        }

        if (part.href.startsWith('/')) {
          return (
            <Link key={`${part.href}-${index}`} to={part.href} className="font-semibold text-teal-700 underline underline-offset-4 hover:text-teal-900">
              {part.label}
            </Link>
          );
        }

        return (
          <a
            key={`${part.href}-${index}`}
            href={part.href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-teal-700 underline underline-offset-4 hover:text-teal-900"
          >
            {part.label}
          </a>
        );
      })}
    </>
  );
}
