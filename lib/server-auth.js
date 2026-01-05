import jwt from 'jsonwebtoken';
import connectToDatabase from './mongodb';
import User from '../model/User';

export async function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    await connectToDatabase();
    const user = await User.findById(decoded.userId);
    return user;
  } catch (error) {
    return null;
  }
}

export async function getUserFromRequest(req) {
  const token = req.cookies.token;
  if (!token) return null;

  return await verifyToken(token);
}

export function requireAuth(getServerSideProps) {
  return async (context) => {
    const token = context.req.cookies.token;

    if (!token) {
      return {
        redirect: {
          destination: '/login?returnUrl=' + encodeURIComponent(context.resolvedUrl),
          permanent: false,
        },
      };
    }

    try {
      const user = await verifyToken(token);
      if (!user) {
        return {
          redirect: {
            destination: '/login?returnUrl=' + encodeURIComponent(context.resolvedUrl),
            permanent: false,
          },
        };
      }

      // Add user to props
      const result = await getServerSideProps ? await getServerSideProps(context) : { props: {} };
      return {
        ...result,
        props: {
          ...result.props,
          user: {
            id: user._id.toString(),
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
          },
        },
      };
    } catch (error) {
      return {
        redirect: {
          destination: '/login?returnUrl=' + encodeURIComponent(context.resolvedUrl),
          permanent: false,
        },
      };
    }
  };
}
