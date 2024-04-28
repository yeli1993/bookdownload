import org.apache.log4j.Logger;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;

import javax.net.ssl.*;
import java.io.BufferedWriter;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.security.KeyManagementException;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.security.cert.X509Certificate;
import java.util.ArrayList;
import java.util.List;

/**
 * @创建人 叶立
 * @创建时间 2024/1/26
 * @描述
 */
public class App {

    private static final Logger logger = Logger.getLogger(App.class);


    public static void main(String[] args) throws NoSuchAlgorithmException, KeyManagementException {

        TrustManager[] trustAllCertificates = new TrustManager[]{
                new X509TrustManager() {
                    public void checkClientTrusted(X509Certificate[] chain, String authType) {}
                    public void checkServerTrusted(X509Certificate[] chain, String authType) {}
                    public X509Certificate[] getAcceptedIssuers() { return null; }
                }
        };

// 创建 SSLContext，并使用上面创建的 TrustManager
        SSLContext sslContext = SSLContext.getInstance("TLS");
        sslContext.init(null, trustAllCertificates, new SecureRandom());

// 设置默认的 SSLContext，以便 Jsoup 使用它
        HttpsURLConnection.setDefaultSSLSocketFactory(sslContext.getSocketFactory());

// 禁用主机名称验证
        HttpsURLConnection.setDefaultHostnameVerifier((hostname, session) -> true);


        //笔趣阁

//        String url = "https://www.biqukan8.cc/38_38964/38859339.html"; // 要爬取的网页地址
//        String path = "剑来.txt";
        String path = "大奉打更人.txt";

//        String url1 = "https://www.biqukan8.cc/38_38964/";
        String url1 = "https://bqg123.net/v3_uni_001?1#/v3/439803/2515204/";
        String domain = url1.substring(0, url1.indexOf("/", url1.indexOf("//") + 2));
        List<String> allUrls = getAllSection(url1);
        deleteFile(path);
        for (int i = 0; i < allUrls.size(); i++) {

            if (i == 0) {
                writeSingleSection(domain + allUrls.get(i), path, false);
            } else {
                writeSingleSection(domain + allUrls.get(i), path, false);
            }

        }

//        writeSingleBook(url,path);


    }

    public static void deleteFile(String path) {
        File file = new File(path);
        if(file.exists()){
            file.delete();
        }

    }

    public static void writeTxt(String path, String content, boolean isOver) {
        boolean isAppend = !isOver;
        try (BufferedWriter writer = new BufferedWriter(new FileWriter(path, isAppend))) {
            writer.write(content);
        } catch (IOException e) {
            System.out.println("写入文件时出现错误：" + e.getMessage());
        }
    }

    /**
     * 获取所有章节
     *
     * @param url
     * @return
     */
    public static List<String> getAllSection(String url) {
        List<String> result = new ArrayList<>();
        try {
            Document doc = Jsoup.connect(url).get(); // 发起 HTTP 请求并获取页面内容
            // 解析页面数据
            Elements links = doc.select("#add_chapter_list_link");
            Element content = links.get(0);
            Elements children = content.children();

            boolean isStart = false;

            for (Element child : children) {
                String title = child.text();
                if (!isStart && title != null) {
                    isStart = title.trim().startsWith("第一章");
                }
                if (isStart) {

                    String aUrl = child.select("a").attr("href");

                    System.out.println(title + "---->: " + aUrl);
                    result.add(aUrl);
                }
            }

        } catch (IOException e) {
            e.printStackTrace();
        }
        return result;
    }

    /**
     * 单章节
     *
     * @param url
     * @param path
     * @param isDeleteIfExists
     */
    public static void writeSingleSection(String url, String path, boolean isDeleteIfExists) {
        try {
            Document doc = Jsoup.connect(url).get(); // 发起 HTTP 请求并获取页面内容

            // 解析页面数据
            Elements links = doc.select(".content");
            Element content = links.get(0);
            Elements children = content.children();

            for (Element child : children) {
                if (child.is("h1")) {
                    String title = child.text() + "\r\n";
                    System.out.println(title);
                    writeTxt(path, title, isDeleteIfExists);
                }
                if (child.is("#content")) {

                    String contentDetail = child.text().replaceAll(" ", "\r\n") +"\r\n\n";
//                    System.out.println(contentDetail);
                    writeTxt(path, contentDetail, isDeleteIfExists);
                }
            }

        } catch (IOException e) {
            e.printStackTrace();
        }

    }
}
