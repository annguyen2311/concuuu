import React from 'react';

export const isImageSource = (value) => {
  const source = String(value || '').trim();
  return /^data:image\//i.test(source) || /^https?:\/\//i.test(source) || source.startsWith('/');
};

export const getAvatarText = (value, fallback = 'U') => {
  const source = String(value || '').trim();
  const label = source && !isImageSource(source) ? source : String(fallback || 'U');
  return Array.from(label).slice(0, 2).join('').toUpperCase() || 'U';
};

function UserAvatar({ value, name = 'User', className = '', imgClassName = '' }) {
  const source = String(value || '').trim();
  const label = getAvatarText(source, name);

  return (
    <div className={`avatar ${className}`} title={name}>
      {isImageSource(source) ? (
        <img
          src={source}
          alt={name}
          className={`h-full w-full object-cover ${imgClassName}`}
          loading="lazy"
        />
      ) : (
        label
      )}
    </div>
  );
}

export default UserAvatar;
