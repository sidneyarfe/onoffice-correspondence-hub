
import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'light' | 'dark';
}

const Logo = ({ size = 'md', variant = 'dark' }: LogoProps) => {
  const sizeClasses = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-4xl'
  };

  const colorClasses = {
    light: 'text-white',
    dark: 'text-on-dark'
  };

  return (
    <div className={`font-bold ${sizeClasses[size]} ${colorClasses[variant]} flex items-center gap-2`}>
      <div className="w-8 h-8 bg-on-lime rounded-lg flex items-center justify-center">
        <span className="text-on-black font-black text-sm">ON</span>
      </div>
      <span>Office</span>
    </div>
  );
};

export default Logo;
