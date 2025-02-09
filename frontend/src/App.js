import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import axios from 'axios';
import { useSwipeable } from 'react-swipeable';

// Styled components (unchanged)
const AppContainer = styled.div`
  height: 100vh;
  width: 100%;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f0f2f5;
`;

const swipeUpAnimation = keyframes`
  0% {
    transform: translateY(0);
    opacity: 1;
  }
  100% {
    transform: translateY(-100%);
    opacity: 0;
  }
`;

const swipeDownAnimation = keyframes`
  0% {
    transform: translateY(0);
    opacity: 1;
  }
  100% {
    transform: translateY(100%);
    opacity: 0;
  }
`;

const NewsCardContainer = styled.div`
  font-family: sans-serif;
  background-color: #fff;
  color: #000;
  width: 100%;
  max-width: 600px;
  height: 100vh;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: relative;
  animation: ${(props) => {
    if (props.swipingUp) return swipeUpAnimation;
    if (props.swipingDown) return swipeDownAnimation;
    return 'none';
  }} 0.5s ease-out forwards;

  @media (max-width: 600px) {
    width: 100%;
    max-width: none;
    border-radius: 0;
    box-shadow: none;
    margin: 0;
  }
`;

const ImageContainer = styled.div`
  position: relative;
  width: 100%;
  height: 50vh;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
  }
`;

const InshortsLabel = styled.div`
  position: absolute;
  top: 10px;
  left: 10px;
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
`;

const ContentContainer = styled.div`
  padding: 16px;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
`;

const Title = styled.h2`
  font-size: 20px;
  margin-bottom: 8px;
`;

const Description = styled.p`
  font-size: 14px;
  line-height: 1.4;
  margin-bottom: 16px;
  color: rgba(0, 0, 0, 0.7);
`;

const Footer = styled.div`
  font-size: 12px;
  color: rgba(0, 0, 0, 0.6);
  padding: 0 0 16px;
  display: flex;
  justify-content: space-between;
`;

const AuthorInfo = styled.div`
  position: absolute;
  bottom: 40px;
  left: 16px;
  right: 16px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const AuthorName = styled.span`
  text-align: left;
  flex: 1;
`;

const AuthorDateLocation = styled.span`
  text-align: right;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
`;

const SwipeUpContainer = styled.div`
  position: absolute;
  bottom: 5px;
  left: 0;
  right: 0;
  text-align: center;
  color: #1877f2;
  cursor: pointer;
  font-size: 12px;
`;

const calculateHoursDifference = (updatedAt) => {
  const now = new Date();
  const updated = new Date(updatedAt);
  const diffInHours = Math.floor((now - updated) / (1000 * 60 * 60));
  return diffInHours;
};

const NewsCard = () => {
  const [newsData, setNewsData] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [swipingUp, setSwipingUp] = useState(false);
  const [swipingDown, setSwipingDown] = useState(false);
  const backendDom = "https://local-happenings.ruprabh.workers.dev";
  
  useEffect(() => {
    const fetchNews = async () => {
      
      setLoading(true);
      setError(null);
      console.log("I am here");
      try {
        const API_ENDPOINT = backendDom+'/news';
        const response = await axios.get(API_ENDPOINT);

        setNewsData(response.data);
        console.log(response.data);
        
      } catch (err) {
        setError(err.message || 'Failed to fetch news');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);
  const generateImgLink = (url) =>{
    console.log(url);
    
    const domain = backendDom+"/news/proxy-image/";
    const match = url.match(/(?:id=|\/d\/)([a-zA-Z0-9_-]+)/)[1];//have the code
    const finalLink =domain+match;
    console.log(finalLink);
     
    return finalLink;

  }
  const handleSwipeUp = () => {
    if (!swipingUp && !swipingDown) {
      setSwipingUp(true);
      setTimeout(() => {
        setSwipingUp(false);
        setCurrentIndex((prevIndex) => (prevIndex + 1) % newsData.length);
      }, 500);
    }
  };

  const handleSwipeDown = () => {
    if (!swipingUp && !swipingDown) {
      setSwipingDown(true);
      setTimeout(() => {
        setSwipingDown(false);
        setCurrentIndex((prevIndex) =>
          prevIndex === 0 ? newsData.length - 1 : prevIndex - 1
        );
      }, 500);
    }
  };

  const swipeHandlers = useSwipeable({
    onSwipedUp: handleSwipeUp,
    onSwipedDown: handleSwipeDown,
    swipeDuration: 500,
    preventScrollOnSwipe: true,
    trackMouse: true,
  });

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'ArrowDown') {
        handleSwipeUp();
      } else if (event.key === 'ArrowUp') {
        handleSwipeDown();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [newsData.length]);

  if (loading) {
    return <AppContainer>Loading news...</AppContainer>;
  }

  if (error) {
    return <AppContainer>Error: {error}</AppContainer>;
  }

  if (!newsData || newsData.length === 0) {
    return <AppContainer>No news to display.</AppContainer>;
  }

  const currentNewsItem = newsData[currentIndex];
  const hoursSinceUpdate = calculateHoursDifference(currentNewsItem.updatedAt);

  return (
    <NewsCardContainer
      {...swipeHandlers}
      swipingUp={swipingUp}
      swipingDown={swipingDown}
    >
      <ImageContainer>
        <img src={generateImgLink(currentNewsItem.photo)} alt={currentNewsItem.title} />
        <InshortsLabel>inshorts</InshortsLabel>
      </ImageContainer>
      <ContentContainer>
        <div>
          <Title>{currentNewsItem.title}</Title>
          <Description>{currentNewsItem.description}</Description>
        </div>
        <Footer>
          <span></span>
        </Footer>
      </ContentContainer>
      <AuthorInfo>
        <AuthorName>Shorts by {currentNewsItem.author}</AuthorName>
        <AuthorDateLocation>
          <span>Updated {hoursSinceUpdate} hours ago</span>
          <span>{currentNewsItem.date}, {currentNewsItem.location}</span>
        </AuthorDateLocation>
      </AuthorInfo>
      <SwipeUpContainer>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginBottom: '3px', transform: 'rotate(-180deg)'}}>
          <path d="M12 5v14M5 12l7 7 7-7" />
        </svg>
        <br/>
        Swipe or use arrow keys
      </SwipeUpContainer>
    </NewsCardContainer>
  );
};

function App() {
  return (
    <AppContainer>
      <NewsCard />
    </AppContainer>
  );
}

export default App;
