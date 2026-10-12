import React from 'react';
import { Box, Tooltip } from '@mui/material';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { useThemeContext } from '../context/ThemeContext';

export const ThemeToggle = ({ size = 'medium', style = {} }) => {
  const { isDark, toggleTheme } = useThemeContext();

  const isSmall = size === 'small';
  const width = isSmall ? 56 : 72;
  const height = isSmall ? 28 : 34;
  const knobSize = isSmall ? 22 : 28;
  const translateDist = isSmall ? 28 : 38;

  return (
    <Tooltip title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'} arrow>
      <Box
        onClick={toggleTheme}
        sx={{
          width: `${width}px`,
          height: `${height}px`,
          borderRadius: `${height / 2}px`,
          position: 'relative',
          cursor: 'pointer',
          userSelect: 'none',
          p: '3px',
          display: 'inline-flex',
          alignItems: 'center',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          background: isDark
            ? 'linear-gradient(135deg, #0b1329 0%, #1e293b 100%)'
            : 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)',
          border: isDark
            ? '1.5px solid rgba(56, 189, 248, 0.3)'
            : '1.5px solid rgba(255, 255, 255, 0.8)',
          boxShadow: isDark
            ? '0 4px 15px rgba(0, 0, 0, 0.6), inset 0 2px 4px rgba(0, 0, 0, 0.5)'
            : '0 4px 15px rgba(14, 165, 233, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.6)',
          overflow: 'hidden',
          ...style,
        }}
      >
        {/* Background Decorative Stars (Dark) or Clouds (Light) */}
        {isDark ? (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              opacity: 0.8,
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                top: '6px',
                left: '12px',
                width: '2px',
                height: '2px',
                bgcolor: '#ffffff',
                borderRadius: '50%',
                boxShadow: '0 0 4px #ffffff',
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                top: '18px',
                left: '20px',
                width: '3px',
                height: '3px',
                bgcolor: '#ffffff',
                borderRadius: '50%',
                boxShadow: '0 0 5px #ffffff',
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                top: '10px',
                left: '30px',
                width: '2px',
                height: '2px',
                bgcolor: '#ffffff',
                borderRadius: '50%',
              }}
            />
          </Box>
        ) : (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              opacity: 0.6,
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                bottom: '4px',
                right: '12px',
                width: '18px',
                height: '10px',
                bgcolor: 'rgba(255, 255, 255, 0.8)',
                borderRadius: '10px',
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                bottom: '8px',
                right: '22px',
                width: '14px',
                height: '8px',
                bgcolor: 'rgba(255, 255, 255, 0.9)',
                borderRadius: '8px',
              }}
            />
          </Box>
        )}

        {/* Sliding Knob (Sun or Moon) */}
        <Box
          sx={{
            width: `${knobSize}px`,
            height: `${knobSize}px`,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), background-color 0.4s ease',
            transform: isDark ? `translateX(${translateDist}px)` : 'translateX(0px)',
            background: isDark
              ? 'linear-gradient(135deg, #f8fafc 0%, #cbd5e1 100%)'
              : 'linear-gradient(135deg, #fef08a 0%, #f59e0b 100%)',
            boxShadow: isDark
              ? '0 2px 8px rgba(0, 0, 0, 0.4), inset 0 -1px 2px rgba(0,0,0,0.2)'
              : '0 2px 10px rgba(245, 158, 11, 0.6), inset 0 1px 2px rgba(255,255,255,0.8)',
          }}
        >
          {isDark ? (
            <DarkModeIcon sx={{ fontSize: isSmall ? 14 : 17, color: '#0f172a' }} />
          ) : (
            <WbSunnyIcon sx={{ fontSize: isSmall ? 14 : 17, color: '#78350f' }} />
          )}
        </Box>
      </Box>
    </Tooltip>
  );
};

export default ThemeToggle;
