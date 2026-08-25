export interface LoginRequestDto {
  username: string;
  password: string;
}

export interface LoginResponseDto {
  accessToken: string;
  expiresIn: number;
  user: {
    username: string;
  };
}

export interface AuthMeResponseDto {
  username: string;
  authenticated: boolean;
}
