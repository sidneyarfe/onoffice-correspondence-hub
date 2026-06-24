
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
    ? "/brand/logo-light.png"
    : "/brand/logo-dark.png";

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
