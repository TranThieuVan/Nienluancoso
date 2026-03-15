import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * 📌 HƯỚNG DẪN SỬ DỤNG:
 * Import và đặt component này ngay bên trong <Router> trong App.jsx hoặc main.jsx:
 *
 * import ScrollToTop from './components/ScrollToTop';
 *
 * <Router>
 *   <ScrollToTop />
 *   <App />
 * </Router>
 */

const ScrollToTop = () => {
    const { pathname } = useLocation();

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [pathname]);

    return null;
};

export default ScrollToTop;