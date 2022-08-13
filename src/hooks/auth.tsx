import React, {
    createContext,
    useCallback,
    useState,
    useContext,
    useEffect,
  } from 'react';

  import * as AuthSession from "expo-auth-session";
  import * as AppleAuthentication from "expo-apple-authentication";
  import AsyncStorage from "@react-native-async-storage/async-storage";

  const { REDIRECT_URI } = process.env;
  const { CLIENT_ID } = process.env;

  interface IUser {
    id: string;
    name: string;
    email: string;
    photo?: string;
  }

  interface AuthorizationResponse {
    params: {
      access_token: string;
    };
    type: string;
  }

  interface IAuthContextData {
    user: IUser;
    loading: boolean;
    signInWithGoogle(): Promise<void>;
    signInWithApple(): Promise<void>;
    signOut(): Promise<void>;
  }

  const AuthContext = createContext<IAuthContextData>({} as IAuthContextData);

  const AuthProvider: React.FC = ({ children }) => {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<IUser>({} as IUser);

    const userStorageKey = "@gofinances:user";

    useEffect(() => {
      async function loadStorageDate(): Promise<void> {
        const data = await AsyncStorage.getItem("@gofinances:user");

        if (data) {
          const userLogged = JSON.parse(data) as IUser;
          setUser(userLogged);
        }

        setLoading(false);
      }

      loadStorageDate();
    }, [setUser, setLoading]);

    const signInWithGoogle = useCallback(async () => {
      try {
        const RESPONSE_TYPE = "token";
        const SCOPE = encodeURI("profile email");

        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=${RESPONSE_TYPE}&scope=${SCOPE}`;

        const { type, params } = (await AuthSession.startAsync({
          authUrl,
        })) as AuthorizationResponse;

        if (type === "success") {
          const response = await fetch(
            `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${params.access_token}`
          );
          const userInfo = await response.json();

          const userLogged = {
            id: userInfo.id,
            email: userInfo.email,
            name: userInfo.given_name,
            photo: userInfo.picture,
          };

          setUser(userLogged);
          await AsyncStorage.setItem(
            userStorageKey,
            JSON.stringify(userLogged)
          );
        }
      } catch (error) {
        throw new Error(error as string);
      }
    }, [setUser]);

    const signInWithApple = useCallback(async () => {
      try {
        const credential = await AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
          ],
        });

        if (credential) {
          const userLogged = {
            id: String(credential.user),
            email: credential.email!,
            name: credential.fullName?.givenName!,
            photo: undefined,
          };

          setUser(userLogged);
          await AsyncStorage.setItem(
            "@gofinances:user",
            JSON.stringify(userLogged)
          );
        }
      } catch (error) {
        throw new Error(error);
      }
    }, [setUser]);

    const signOut = useCallback(async () => {
      setUser({} as IUser);
      await AsyncStorage.removeItem("@gofinances:user");
    }, [setUser]);

    return (
      <AuthContext.Provider
        value={{
          user,
          signInWithGoogle,
          signInWithApple,
          signOut,
          loading,
        }}
      >
        {children}
      </AuthContext.Provider>
    );
  };
  
  function useAuth(): IAuthContextData {
    const context = useContext(AuthContext);
  
    return context;
  }
  
  export { AuthProvider, useAuth };