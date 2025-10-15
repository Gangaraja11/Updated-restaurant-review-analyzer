#http://127.0.0.1:5000/history

# train_model.py
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.naive_bayes import MultinomialNB
from sklearn.neighbors import KNeighborsClassifier
from sklearn.svm import SVC
from sklearn.metrics import classification_report, accuracy_score
import pickle

# 1. Load dataset
dataset = pd.read_csv("Restaurant_Reviews_5000.tsv", delimiter="\t")

# 2. Map 'Liked' to 'Sentiment'
dataset["Sentiment"] = dataset["Liked"].map({1: "Positive", 0: "Negative"})

# 3. Drop missing rows
dataset = dataset.dropna(subset=["Review", "Sentiment"])

# 4. Add 100 Neutral reviews
neutral_reviews = [
    "The food was okay, nothing special.",
    "Service was average, not too bad.",
    "It was just fine, not great, not terrible.",
    "The restaurant is okay for a casual visit.",
    "I felt neutral about the whole experience.",
    # (rest of your neutral reviews...)
]
neutral_df = pd.DataFrame({"Review": neutral_reviews, "Sentiment": ["Neutral"] * len(neutral_reviews)})

# 5. Combine original + neutral
dataset = pd.concat([dataset, neutral_df], ignore_index=True)

# 6. Features and labels
X = dataset["Review"]
y = dataset["Sentiment"].astype(str)

# 7. Train-test split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# 8. Vectorization
vectorizer = TfidfVectorizer(max_features=2000)
X_train_vec = vectorizer.fit_transform(X_train)
X_test_vec = vectorizer.transform(X_test)

# 9. Models to compare
models = {
    "Logistic Regression": LogisticRegression(max_iter=1000, class_weight="balanced"),
    "Naive Bayes": MultinomialNB(),
    "KNN": KNeighborsClassifier(n_neighbors=5),
    "SVM": SVC(kernel="linear", probability=True, class_weight="balanced")
}

results = {}
best_model = None
best_acc = 0

# 10. Train and evaluate each model
for name, model in models.items():
    model.fit(X_train_vec, y_train)
    y_pred = model.predict(X_test_vec)
    acc = accuracy_score(y_test, y_pred)
    results[name] = acc
    print(f"\n=== {name} ===")
    print(classification_report(y_test, y_pred))
    print(f"Accuracy: {acc:.4f}")
    
    if acc > best_acc:
        best_acc = acc
        best_model = model

# 11. Save the best model + vectorizer
pickle.dump(best_model, open("sentiment_model.pkl", "wb"))
pickle.dump(vectorizer, open("vectorizer.pkl", "wb"))

print("\n✅ Training complete!")
print(f"Best Model: {best_model.__class__.__name__} with Accuracy = {best_acc:.4f}")