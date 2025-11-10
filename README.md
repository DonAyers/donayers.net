# donayers.net

A modern web application built with Astro and TinaCMS, using GitHub as the content backend.

## Tech Stack

- **[Astro](https://astro.build/)** - Static site generator
- **[TinaCMS](https://tina.io/)** - Git-backed headless CMS
- **GitHub** - Content storage and version control

## Prerequisites

- Node.js 18+ 
- npm or yarn
- GitHub account

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/yourusername/donayers.net.git
cd donayers.net
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Access TinaCMS:
```bash
npm run dev:tina
```

Visit `http://localhost:4321` to see your site.
Visit `http://localhost:4321/admin` to access the CMS.

## Project Structure

```
/
├── src/
│   ├── pages/
│   ├── components/
│   └── layouts/
├── content/
├── tina/
│   └── config.ts
└── public/
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## License

MIT