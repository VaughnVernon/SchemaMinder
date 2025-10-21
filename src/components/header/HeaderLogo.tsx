import React from 'react';
import domoLogo from '../../assets/images/domo-logo.svg';

export const HeaderLogo: React.FC = () => {
  return (
    <div className="header-logo">
      <img
        src={domoLogo}
        alt="Domo"
        className="logo-image"
      />
    </div>
  );
};