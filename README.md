# Medipal

A modern medical application built with React, TypeScript, and Supabase.

## 🚀 Features

- Modern, responsive UI built with React and shadcn-ui components
- Real-time database with Supabase
- Type-safe development with TypeScript
- Fast development experience with Vite

## 🛠️ Tech Stack

- **Frontend Framework:** React 18
- **Build Tool:** Vite 5
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** shadcn-ui (Radix UI primitives)
- **Backend:** Supabase
- **State Management:** TanStack React Query
- **Routing:** React Router DOM

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v16 or higher)
- npm (comes with Node.js) or [Bun](https://bun.sh/)

## 🔧 Setup & Installation

1. **Clone the repository**
   ```sh
   git clone <YOUR_GIT_URL>
   cd medipal
   ```

2. **Install dependencies**
   ```sh
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Start the development server**
   ```sh
   npm run dev
   ```

   The app will be running at `http://localhost:5173`

## 📜 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run build:dev` - Build for development environment
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint

## 🌐 Deployment

Build the production bundle:

```sh
npm run build
```

The production-ready files will be in the `dist/` directory. You can deploy these to any static hosting service like Vercel, Netlify, or GitHub Pages.

## 💡 Development Tips

- The project uses **shadcn-ui** components - they can be customized in the `components/` directory
- Supabase configuration is in the `supabase/` directory
- Tailwind configuration can be found in `tailwind.config.ts`

## 🤝 Contributing

Contributions are welcome! Here's how you can contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - see LICENSE file for details
