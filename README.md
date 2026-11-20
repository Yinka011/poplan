# POPLAN

A modern pop-up planning platform with role-based login for organizers and brand managers.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the login page.

## Stack

- [Next.js 15](https://nextjs.org/) (App Router)
- [React 19](https://react.dev/)
- [Tailwind CSS 4](https://tailwindcss.com/)
- TypeScript

## Brand uploads

New brand documents are stored in Cloudinary under `poplan/{event_slug}/{brand_email}/`.
Product photos and shipment invoices use `products/` and `shipment-invoices/`
subfolders respectively. Brand and organizer views list documents for the selected
event only; older files in shared Cloudinary or Supabase folders are not shown or moved.
Existing product and invoice URLs remain unchanged.
Folder names use the event slug and email as-is. Emails with characters outside
letters, digits, `.`, `_`, `@`, and `-` cannot currently be used as folder
names; uploads report an error rather than writing to a different folder.

## Design

The login page uses a nude and brown color palette with Cormorant Garamond for the POPLAN wordmark and DM Sans for body text.
