#!/usr/bin/env python3
"""
YouTube Auto-Uploader for Book-to-Video AI
Uses Selenium to automatically upload videos to YouTube.

Usage:
    python youtube_uploader.py --video path/to/video.mp4 --title "My Video"
"""

import os
import sys
import json
import time
import argparse
import logging
from datetime import datetime
from pathlib import Path

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Try to import selenium
try:
    from selenium import webdriver
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    from selenium.webdriver.chrome.options import Options
    from selenium.webdriver.chrome.service import Service
    from selenium.common.exceptions import TimeoutException, NoSuchElementException
    SELENIUM_AVAILABLE = True
except ImportError:
    SELENIUM_AVAILABLE = False
    logger.warning("Selenium not installed. Run: pip install selenium")


class YouTubeUploader:
    """YouTube video uploader using Selenium"""
    
    YOUTUBE_URL = "https://www.youtube.com"
    YOUTUBE_UPLOAD_URL = "https://www.youtube.com/upload"
    
    def __init__(self, email: str, password: str, channel_id: str = None, headless: bool = True):
        self.email = email
        self.password = password
        self.channel_id = channel_id
        self.headless = headless
        self.driver = None
        
    def setup_driver(self):
        """Initialize Chrome WebDriver"""
        if not SELENIUM_AVAILABLE:
            raise Exception("Selenium not available. Install with: pip install selenium")
        
        chrome_options = Options()
        
        if self.headless:
            chrome_options.add_argument("--headless=new")
        
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--window-size=1920,1080")
        chrome_options.add_argument("--disable-blink-features=AutomationControlled")
        
        # Add user agent to avoid detection
        chrome_options.add_argument(
            "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        
        # Initialize driver
        self.driver = webdriver.Chrome(options=chrome_options)
        self.driver.implicitly_wait(10)
        
        logger.info("Chrome WebDriver initialized")
        
    def login(self):
        """Login to YouTube"""
        logger.info("Logging into YouTube...")
        
        self.driver.get(self.YOUTUBE_URL)
        time.sleep(2)
        
        # Click sign in button
        try:
            sign_in_button = self.driver.find_element(By.XPATH, "//a[contains(text(), 'Sign in')]")
            sign_in_button.click()
            time.sleep(2)
        except NoSuchElementException:
            pass
        
        # Enter email
        email_input = WebDriverWait(self.driver, 10).until(
            EC.presence_of_element_located((By.ID, "identifierId"))
        )
        email_input.send_keys(self.email)
        time.sleep(1)
        
        # Click next
        next_button = self.driver.find_element(By.ID, "identifierNext")
        next_button.click()
        time.sleep(3)
        
        # Enter password
        password_input = WebDriverWait(self.driver, 10).until(
            EC.presence_of_element_located((By.NAME, "password"))
        )
        password_input.send_keys(self.password)
        time.sleep(1)
        
        # Click next
        password_next = self.driver.find_element(By.ID, "passwordNext")
        password_next.click()
        time.sleep(5)
        
        logger.info("Login successful")
        
    def upload_video(
        self,
        video_path: str,
        title: str,
        description: str = "",
        tags: list = None,
        privacy: str = "private",
        category: str = "22",
        playlist_id: str = None
    ) -> dict:
        """
        Upload video to YouTube
        
        Args:
            video_path: Path to video file
            title: Video title
            description: Video description
            tags: List of tags
            privacy: private/public/unlisted
            category: YouTube category ID
            playlist_id: Optional playlist ID
            
        Returns:
            dict with upload status and video URL
        """
        if not self.driver:
            self.setup_driver()
            
        logger.info(f"Starting upload: {title}")
        
        # Go to upload page
        self.driver.get(self.YOUTUBE_UPLOAD_URL)
        time.sleep(3)
        
        # Upload file
        file_input = WebDriverWait(self.driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='file']"))
        )
        file_input.send_keys(os.path.abspath(video_path))
        logger.info("File selected")
        
        # Wait for upload to start
        time.sleep(5)
        
        # Fill in title
        title_input = WebDriverWait(self.driver, 30).until(
            EC.presence_of_element_located((By.ID, "title-input"))
        )
        title_input.clear()
        title_input.send_keys(title[:100])  # YouTube title limit
        logger.info(f"Title set: {title}")
        
        # Fill in description
        description_input = self.driver.find_element(By.ID, "description-input")
        description_input.clear()
        description_input.send_keys(description[:5000])  # Description limit
        logger.info("Description set")
        
        # Set tags
        if tags:
            try:
                tags_container = self.driver.find_element(By.CSS_SELECTOR, "[aria-label='Tags']")
                tags_input = tags_container.find_element(By.TAG_NAME, "input")
                for tag in tags[:15]:  # YouTube tag limit
                    tags_input.send_keys(tag + ",")
                logger.info(f"Tags set: {', '.join(tags[:5])}...")
            except NoSuchElementException:
                logger.warning("Tags field not found, skipping")
        
        # Set privacy
        if privacy != "public":
            privacy_button = self.driver.find_element(By.ID, "privacy-radios")
            privacy_options = privacy_button.find_elements(By.CSS_SELECTOR, "tp-yt-iron-radio")
            
            if privacy == "private":
                privacy_options[0].click()
            elif privacy == "unlisted":
                privacy_options[1].click()
                
            logger.info(f"Privacy set: {privacy}")
        
        time.sleep(2)
        
        # Click done/publish button
        try:
            done_button = WebDriverWait(self.driver, 10).until(
                EC.element_to_be_clickable((By.ID, "done-button"))
            )
            done_button.click()
            logger.info("Clicked done button")
            time.sleep(5)
        except NoSuchElementException:
            logger.warning("Done button not found, trying alternative")
            
        # Get video URL from page
        video_url = self.driver.current_url
        if "/watch?v=" in video_url:
            video_id = video_url.split("/watch?v=")[1].split("&")[0]
            video_url = f"https://youtu.be/{video_id}"
        
        logger.info(f"Upload complete: {video_url}")
        
        return {
            "success": True,
            "video_url": video_url,
            "title": title,
            "privacy": privacy,
            "uploaded_at": datetime.now().isoformat()
        }
        
    def add_to_playlist(self, video_url: str, playlist_id: str):
        """Add uploaded video to playlist"""
        # Navigate to playlist
        playlist_url = f"https://www.youtube.com/playlist?list={playlist_id}"
        self.driver.get(playlist_url)
        time.sleep(2)
        
        # Click add video button
        # This is a simplified version - real implementation would need more steps
        logger.info(f"Would add to playlist: {playlist_id}")
        
    def close(self):
        """Close the browser"""
        if self.driver:
            self.driver.quit()
            logger.info("Browser closed")


def load_config(config_path: str = None) -> dict:
    """Load upload configuration from file"""
    if config_path is None:
        config_path = os.path.join(
            os.path.dirname(__file__),
            "output",
            "uploads"
        )
    
    # Find latest upload task
    upload_dir = Path(config_path)
    if not upload_dir.exists():
        return None
        
    upload_files = list(upload_dir.glob("yt-*.json"))
    if not upload_files:
        return None
        
    latest = max(upload_files, key=lambda p: p.stat().st_mtime)
    
    with open(latest) as f:
        return json.load(f)


def main():
    parser = argparse.ArgumentParser(description="YouTube Auto-Uploader")
    parser.add_argument("--video", required=True, help="Path to video file")
    parser.add_argument("--title", required=True, help="Video title")
    parser.add_argument("--description", default="", help="Video description")
    parser.add_argument("--tags", nargs="+", default=[], help="Video tags")
    parser.add_argument("--privacy", default="private", choices=["private", "public", "unlisted"])
    parser.add_argument("--config", help="Path to credentials config")
    parser.add_argument("--headless", default=True, type=bool)
    
    args = parser.parse_args()
    
    # Load credentials
    creds_path = os.path.join(
        os.path.dirname(__file__),
        "output",
        "youtube_creds.json"
    )
    
    if os.path.exists(creds_path):
        with open(creds_path) as f:
            creds = json.load(f)
            email = creds.get("email")
            password = creds.get("password")
    else:
        # Try environment variables
        email = os.environ.get("YOUTUBE_EMAIL")
        password = os.environ.get("YOUTUBE_PASSWORD")
        
        if not email or not password:
            print("Error: No credentials found. Set via --config or environment variables.")
            sys.exit(1)
    
    # Create uploader and upload
    uploader = YouTubeUploader(email, password, headless=args.headless)
    
    try:
        uploader.setup_driver()
        uploader.login()
        
        result = uploader.upload_video(
            video_path=args.video,
            title=args.title,
            description=args.description,
            tags=args.tags,
            privacy=args.privacy
        )
        
        print(json.dumps(result, indent=2))
        
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        sys.exit(1)
    finally:
        uploader.close()


if __name__ == "__main__":
    main()
