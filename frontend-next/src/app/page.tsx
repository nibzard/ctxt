// ABOUTME: Homepage component with ConversionForm and main landing content
// ABOUTME: Entry point for URL conversion and context building functionality

import ConversionForm from '@/components/ConversionForm';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-100">
      <ConversionForm />
    </div>
  );
}
