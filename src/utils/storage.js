const USER_KEY = 'agrobridge:user';
const ACCESS_KEY = 'agrobridge:access';
const REFRESH_KEY = 'agrobridge:refresh';

const safeParse = (value) => {
  if (!value) {
    return null;
  }
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

export const loadAuthState = () => ({
  user: safeParse(localStorage.getItem(USER_KEY)),
  accessToken: sessionStorage.getItem(ACCESS_KEY),
  refreshToken: sessionStorage.getItem(REFRESH_KEY),
});

export const persistAuthState = ({ user, accessToken, refreshToken }) => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  sessionStorage.setItem(ACCESS_KEY, accessToken);
  if (refreshToken) {
    sessionStorage.setItem(REFRESH_KEY, refreshToken);
  }
};

export const clearAuthState = () => {
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(ACCESS_KEY);
  sessionStorage.removeItem(REFRESH_KEY);
};

export const getAccessToken = () => sessionStorage.getItem(ACCESS_KEY);



