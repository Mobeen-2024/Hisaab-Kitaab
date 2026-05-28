import React from 'react';

const PageLoader = () => (
  <div className="flex items-center justify-center h-full w-full py-20 text-center" role="status" aria-live="polite" aria-label="Loading Content">
    <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" aria-hidden="true"></div>
  </div>
);

export default PageLoader;
