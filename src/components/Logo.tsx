
import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'light' | 'dark';
}

const Logo = ({ size = 'md', variant = 'dark' }: LogoProps) => {
  const sizeClasses = {
    sm: 'h-6',
    md: 'h-8', 
    lg: 'h-12'
  };

  // Usar a imagem para fundos escuros quando variant for 'light'
  const logoSrc = variant === 'light' 
    ? "/lovable-uploads/0a5539c1-f843-49c7-b8c8-74a25ed5ae6a.png"
    : "/lovable-uploads/097e40db-b932-4530-9a96-19802dc82d39.png";

  return (
    <div className="flex items-center">
      <img 
        src={logoSrc} 
        alt="ON Office" 
        className={`${sizeClasses[size]} w-auto object-contain`}
      />
    </div>
  );
};

export default Logo;
